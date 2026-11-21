import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import test from "node:test"
import { SourceTextModule, SyntheticModule } from "node:vm"

const root = new URL("../../", import.meta.url)
const sources = Object.fromEntries(await Promise.all(["store", "hooks", "api", "constants"].map(async (name) =>
  [name, stripTypeScriptTypes(await readFile(new URL(`src/lib/${name}.ts`, root), "utf8"))])))

const mock = (exports) => new SyntheticModule(Object.keys(exports), function () {
  for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
})

async function setup() {
  const calls = []
  const writes = []
  const invalidations = []
  const modules = {
    zustand: mock({ create: () => (factory) => {
      let state
      const store = (selector) => selector(state)
      store.getState = () => state
      store.setState = (update) => { state = { ...state, ...(typeof update === "function" ? update(state) : update) } }
      state = factory(store.setState, store.getState)
      return store
    } }),
    "zustand/middleware": mock({ persist: (factory) => factory }),
    "@/lib/constants": new SourceTextModule(sources.constants),
    "@/lib/store": new SourceTextModule(sources.store),
    "@/lib/api": mock({ apiFetch: async (path, options) => { calls.push({ path, options }); return {} } }),
    "@tanstack/react-query": mock({
      useQuery: (options) => options,
      useMutation: (options) => options,
      useQueryClient: () => ({
        setQueryData: (key, data) => writes.push({ key, data }),
        invalidateQueries: (filter) => invalidations.push(filter),
      }),
    }),
  }
  const load = async (source) => {
    const module = new SourceTextModule(source)
    await module.link((name) => modules[name])
    await module.evaluate()
    return module.namespace
  }
  const hooks = await load(sources.hooks)
  return { hooks, store: modules["@/lib/store"].namespace.useAppStore, calls, writes, invalidations, load }
}

test("logout y cambio de cuenta reinician la sesión, filtros y reporte seleccionado", async () => {
  const { store } = await setup()
  store.getState().setAuth({ id: "ana" }, "token-ana")
  const firstVersion = store.getState().sessionVersion
  store.setState({ selectedReporteId: "privado", reportesFilter: { tecnico: "ana" }, theme: "dark" })
  store.getState().logout()
  assert.equal(store.getState().user, null)
  assert.equal(store.getState().token, null)
  assert.equal(store.getState().selectedReporteId, null)
  assert.deepEqual(store.getState().reportesFilter, {})
  assert.equal(store.getState().theme, "dark")
  assert.ok(store.getState().sessionVersion > firstVersion)
  store.getState().setAuth({ id: "ana" }, "token-ana")
  const secondVersion = store.getState().sessionVersion
  assert.ok(secondVersion > firstVersion)
  store.getState().setAuth({ id: "ana", name: "Nombre actualizado" }, "token-ana")
  assert.equal(store.getState().sessionVersion, secondVersion)
  store.getState().setAuth({ id: "luis" }, "token-luis")
  assert.ok(store.getState().sessionVersion > secondVersion)
})

const queries = [
  ["useReportes", { estado: "pendiente" }], ["useReporte", "reporte"],
  ["useResumen"], ["usePorMes"], ["usePorTipo"], ["usePorArea"], ["usePorTecnico"], ["useRanking", "ana"],
  ["useNotificacionesPendientes"], ["useUsuarios", { rol: "tecnico" }],
  ["useTiposTarea"], ["useAreas"], ["useUbicaciones", "area"], ["useTecnicos"], ["useTiposEquipo"],
]

for (const [name, ...args] of queries) {
  test(`${name}: aísla cuentas, exige sesión y permite abortar la petición`, async () => {
    const { hooks, store, calls } = await setup()
    assert.equal(hooks[name](...args).enabled, false)
    store.getState().setAuth({ id: "ana" }, "token-ana")
    const first = hooks[name](...args)
    store.getState().setAuth({ id: "luis" }, "token-luis")
    const second = hooks[name](...args)
    assert.equal(second.enabled, true)
    assert.notDeepEqual(first.queryKey, second.queryKey)
    const { signal } = new AbortController()
    await second.queryFn({ signal })
    assert.equal(calls.at(-1).options.signal, signal)
  })
}

test("las mutaciones actualizan e invalidan la clave de detalle de su usuario", async () => {
  const { hooks, store, writes, invalidations } = await setup()
  store.getState().setAuth({ id: "ana" }, "token-ana")
  const key = hooks.useReporte("reporte").queryKey
  const mutations = [hooks.useActualizarReporte("reporte"), hooks.useCambiarEstado("reporte"), hooks.useSubirArchivo("reporte")]
  store.getState().setAuth({ id: "luis" }, "token-luis")
  for (const mutation of mutations) {
    mutation.onSuccess({ item: { id: "reporte" } })
    assert.deepEqual(writes.at(-1).key, key)
  }
  hooks.useEliminarArchivo("reporte").onSuccess()
  assert.deepEqual(invalidations.at(-1).queryKey, hooks.useReporte("reporte").queryKey)
})

test("un 401 tardío no cierra la sesión nueva; un 401 actual sí", async (t) => {
  const { store, load } = await setup()
  const { apiFetch } = await load(sources.api)
  let respond
  t.mock.method(globalThis, "fetch", () => new Promise((resolve) => { respond = resolve }))
  store.getState().setAuth({ id: "ana" }, "token-ana")
  const oldRequest = apiFetch("/reportes")
  store.getState().logout()
  store.getState().setAuth({ id: "luis" }, "token-luis")
  respond(new Response('{"error":"Sesión expirada"}', { status: 401 }))
  await assert.rejects(oldRequest, { status: 401 })
  assert.equal(store.getState().user.id, "luis")
  const currentRequest = apiFetch("/reportes")
  respond(new Response('{"error":"Sesión expirada"}', { status: 401 }))
  await assert.rejects(currentRequest, { status: 401 })
  assert.equal(store.getState().user, null)
})
