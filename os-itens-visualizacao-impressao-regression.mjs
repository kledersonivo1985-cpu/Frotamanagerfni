import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');

// Extrai o bloco dos helpers (fonte única de Visualizar e Imprimir).
const ini=html.indexOf('const _OS_ITEM_ST');
const fim=html.indexOf('function verOS(i){');
assert.ok(ini>0 && fim>ini,'helpers de itens da OS devem existir antes de verOS');
const ctx={};
vm.createContext(ctx);
vm.runInContext(html.slice(ini,fim)+';this.api={_osItensDetalhados,_osItensResumo,_osItensResumoTexto,_osItemBadgeHtml};',ctx);
const {_osItensDetalhados,_osItensResumo,_osItensResumoTexto,_osItemBadgeHtml}=ctx.api;

const itens=[
  {descricao:'Troca de óleo',status_exec:'executado',data_exec:'2026-10-10',responsavel_exec:'João',obs:'ok'},
  {descricao:'Filtro de ar',status_exec:'executado',data_exec:'2026-10-11',responsavel_exec:'Maria'},
  {descricao:'Freios',status_exec:'executado',data_exec:'2026-10-12',responsavel_exec:'João'},
  {descricao:'Alinhamento',status_exec:'pendente'},
  {descricao:'Correia',status_exec:'parcial'},
  {descricao:'Item antigo sem status'},
  {descricao:'Item descartado',status_exec:'nao_executado',data_exec:'2026-10-01',responsavel_exec:'X'}
];

for(const status of ['aberta','em_andamento','concluida']){
  const rows=_osItensDetalhados({status,itens});
  assert.equal(rows.length,7,`${status}: todos os itens devem aparecer`);
  assert.deepEqual(rows.map(r=>r.label),['Executado','Executado','Executado','Pendente','Em execução','Pendente','Cancelado']);
}
const r=_osItensResumo({itens});
assert.equal(r.executado,3); assert.equal(r.pendente,2); assert.equal(r.parcial,1); assert.equal(r.nao_executado,1);
assert.match(_osItensResumoTexto({itens}),/3 executado/);
const rows=_osItensDetalhados({itens});
assert.equal(rows[0].data,'2026-10-10'); assert.equal(rows[0].responsavel,'João');
assert.equal(rows[3].data,''); assert.equal(rows[3].responsavel,'', 'pendente não exibe data/responsável');
assert.equal(rows[6].data,'', 'cancelado não exibe data de execução');
assert.match(_osItemBadgeHtml(rows[0],true),/EXECUTADO/);
assert.equal(_osItensDetalhados({}).length,0);
// não muta os dados originais
assert.equal(itens[5].status_exec,undefined);

// Visualizar e Imprimir usam a MESMA fonte e não filtram por status.
const ver=html.slice(html.indexOf('function verOS(i){'),html.indexOf('function editarItensOS(i){'));
const imp=html.slice(html.indexOf('function imprimirOS(i){'));
for(const [nome,src] of [['verOS',ver],['imprimirOS',imp.slice(0,imp.indexOf('function imprimirRelOSAbertas')>0?imp.indexOf('function imprimirRelOSAbertas'):undefined)]]){
  assert.match(src,/_osItensDetalhados\(os\)/,`${nome} deve usar _osItensDetalhados`);
}
assert.doesNotMatch(ver.slice(ver.indexOf('Itens / Serviços'),ver.indexOf('Execução Diária')),/\.filter\(/,'verOS não pode filtrar itens por status');
// Edição preserva histórico e grava data/responsável da execução.
const salvar=html.slice(html.indexOf('function salvarEdicaoOS(i){'),html.indexOf('function editStatusOS(i){'));
assert.match(salvar,/\.\.\.\(orig\|\|\{\}\)/,'salvarEdicaoOS deve preservar campos do item original');
assert.match(salvar,/data_exec:/); assert.match(salvar,/responsavel_exec:/);

console.log('PASS: Visualizar OS e 2ª via exibem todos os itens com status, data e responsável.');
