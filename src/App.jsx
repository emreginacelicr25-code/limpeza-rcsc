import React, { useEffect, useState } from 'react'
import { supabase, WHATSAPP_ESCOLA } from './supabase.js'

const CORES = { 'João':'#1565C0','Igor':'#2E7D32','Ana':'#AD1457','Ivani':'#E65100','Daniela':'#00838F','Supervisora':'#1F4E79' }
const hoje = () => new Date().toISOString().slice(0,10)
const diaSemana = d => ['dom','seg','ter','qua','qui','sex','sab'][new Date(d+'T12:00:00').getDay()]
const fmt = d => d?.split('-').reverse().join('/')

function Chip({ nome, ativo, onClick }) {
  return (
    <button onClick={onClick} style={{background:CORES[nome]||'#5E5E6E', opacity:ativo?1:.45}}
      className="display text-white font-extrabold rounded-full px-4 py-2 text-sm shadow transition">
      {nome.toUpperCase()}
    </button>
  )
}
function Card({ children, className='' }) {
  return <div className={`bg-white rounded-2xl shadow p-4 ${className}`}>{children}</div>
}
function Titulo({ children }) {
  return <h2 className="display text-xl font-extrabold text-[#1F4E79] mb-3">{children}</h2>
}

/* ================= ROTINA DO DIA ================= */
function Rotina({ usuario }) {
  const [data, setData] = useState(hoje())
  const [tarefas, setTarefas] = useState([])
  const [exec, setExec] = useState({})
  const [obs, setObs] = useState({})
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { carregar() }, [data, usuario])
  async function carregar() {
    setCarregando(true)
    const { data: t } = await supabase.from('limpeza_tarefas').select('*').eq('asg_nome', usuario).order('ordem')
    const dow = diaSemana(data)
    const filtradas = (t||[]).filter(x => !x.dias || x.dias.length===0 || x.dias.includes(dow))
    setTarefas(filtradas)
    const { data: e } = await supabase.from('limpeza_execucoes').select('*').eq('data', data).eq('asg_nome', usuario)
    const m = {}; const o = {}
    ;(e||[]).forEach(x => { m[x.tarefa_id]=x; if(x.observacao) o[x.tarefa_id]=x.observacao })
    setExec(m); setObs(o); setCarregando(false)
  }
  async function marcar(t) {
    const atual = exec[t.id]
    if (atual) {
      await supabase.from('limpeza_execucoes').update({ concluida: !atual.concluida }).eq('id', atual.id)
    } else {
      await supabase.from('limpeza_execucoes').insert({ data, tarefa_id: t.id, asg_nome: usuario, concluida: true })
    }
    carregar()
  }
  async function salvarObs(t) {
    const atual = exec[t.id]
    if (atual) await supabase.from('limpeza_execucoes').update({ observacao: obs[t.id]||'' }).eq('id', atual.id)
    else await supabase.from('limpeza_execucoes').insert({ data, tarefa_id: t.id, asg_nome: usuario, concluida:false, observacao: obs[t.id]||'' })
    carregar()
  }
  const feitas = tarefas.filter(t => exec[t.id]?.concluida).length
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Titulo>🕐 Rotina do dia — {usuario}</Titulo>
          <input type="date" value={data} onChange={e=>setData(e.target.value)} className="border rounded-lg px-3 py-2"/>
        </div>
        <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-3 rounded-full transition-all" style={{width:`${tarefas.length? (feitas/tarefas.length*100):0}%`, background:CORES[usuario]}}/>
        </div>
        <p className="text-sm text-gray-600 mt-1">{feitas} de {tarefas.length} tarefas concluídas em {fmt(data)}</p>
      </Card>
      {carregando ? <Card>Carregando…</Card> : tarefas.map(t => (
        <Card key={t.id} className={exec[t.id]?.concluida ? 'opacity-70' : ''}>
          <div className="flex items-start gap-3">
            <button onClick={()=>marcar(t)}
              className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-lg font-bold shrink-0 ${exec[t.id]?.concluida?'bg-green-600 border-green-600 text-white':'border-gray-300 text-transparent'}`}>✓</button>
            <div className="flex-1">
              <p className="font-bold">{t.hora_inicio?.slice(0,5)}–{t.hora_fim?.slice(0,5)} • {t.descricao}</p>
              <div className="flex gap-2 mt-2">
                <input value={obs[t.id]||''} onChange={e=>setObs({...obs,[t.id]:e.target.value})}
                  placeholder="Observação (opcional)" className="flex-1 border rounded-lg px-3 py-1.5 text-sm"/>
                <button onClick={()=>salvarObs(t)} className="text-sm bg-[#1F4E79] text-white rounded-lg px-3">Salvar</button>
              </div>
            </div>
          </div>
        </Card>
      ))}
      {!carregando && tarefas.length===0 && <Card>Nenhuma tarefa cadastrada para {usuario} neste dia da semana.</Card>}
    </div>
  )
}

/* ================= OCORRÊNCIAS ================= */
function Ocorrencias({ usuario }) {
  const [lista, setLista] = useState([])
  const [f, setF] = useState({ ambiente:'', tipo:'leve', descricao:'' })
  const [foto, setFoto] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(()=>{ carregar() },[])
  async function carregar() {
    const { data } = await supabase.from('limpeza_ocorrencias').select('*').order('criada_em',{ascending:false}).limit(50)
    setLista(data||[])
  }
  async function salvar() {
    if (!f.ambiente || !f.descricao) return alert('Informe o ambiente e a descrição.')
    setSalvando(true)
    let foto_url = null
    if (foto) {
      const nome = `${Date.now()}_${foto.name.replace(/[^a-zA-Z0-9.]/g,'_')}`
      const { error } = await supabase.storage.from('fotos-limpeza_ocorrencias').upload(nome, foto)
      if (!error) {
        const { data } = supabase.storage.from('fotos-limpeza_ocorrencias').getPublicUrl(nome)
        foto_url = data.publicUrl
      }
    }
    await supabase.from('limpeza_ocorrencias').insert({ ...f, asg_nome: usuario, data: hoje(), foto_url })
    setF({ ambiente:'', tipo:'leve', descricao:'' }); setFoto(null); setSalvando(false); carregar()
  }
  function zap(o) {
    const txt = `🧹 OCORRÊNCIA (${o.tipo.toUpperCase()})%0AAmbiente: ${o.ambiente}%0AData: ${fmt(o.data)}%0ARegistrado por: ${o.asg_nome}%0A${o.descricao}${o.foto_url?'%0AFoto: '+o.foto_url:''}`
    window.open(`https://wa.me/${WHATSAPP_ESCOLA}?text=${txt}`,'_blank')
  }
  const corTipo = { leve:'bg-yellow-100 text-yellow-800', media:'bg-orange-100 text-orange-800', grave:'bg-red-100 text-red-800' }
  return (
    <div className="space-y-4">
      <Card>
        <Titulo>📸 Registrar ocorrência</Titulo>
        <div className="grid md:grid-cols-2 gap-3">
          <input value={f.ambiente} onChange={e=>setF({...f,ambiente:e.target.value})} placeholder="Ambiente (ex.: Banheiro feminino)" className="border rounded-lg px-3 py-2"/>
          <select value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value})} className="border rounded-lg px-3 py-2">
            <option value="leve">Leve — sujeira excessiva</option>
            <option value="media">Média — desperdício / uso indevido</option>
            <option value="grave">Grave — dano ao patrimônio</option>
          </select>
          <textarea value={f.descricao} onChange={e=>setF({...f,descricao:e.target.value})} placeholder="Descreva o que encontrou" className="border rounded-lg px-3 py-2 md:col-span-2" rows={2}/>
          <input type="file" accept="image/*" capture="environment" onChange={e=>setFoto(e.target.files[0])} className="md:col-span-2 text-sm"/>
        </div>
        <button onClick={salvar} disabled={salvando} className="mt-3 bg-[#1F4E79] text-white font-bold rounded-xl px-5 py-2.5">
          {salvando?'Salvando…':'Salvar ocorrência'}
        </button>
        <p className="text-xs text-gray-500 mt-2">Após salvar, use o botão WhatsApp para enviar ao número oficial da escola. Toda interlocução é com a direção.</p>
      </Card>
      {lista.map(o => (
        <Card key={o.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${corTipo[o.tipo]}`}>{o.tipo.toUpperCase()}</span>
            <span className="font-bold">{o.ambiente}</span>
            <span className="text-sm text-gray-500">• {fmt(o.data)} • {o.asg_nome}</span>
            <button onClick={()=>zap(o)} className="ml-auto text-sm bg-green-600 text-white rounded-lg px-3 py-1.5 font-bold">Enviar no WhatsApp 📲</button>
          </div>
          <p className="text-sm mt-1">{o.descricao}</p>
          {o.foto_url && <img src={o.foto_url} alt="" className="mt-2 rounded-xl max-h-56"/>}
        </Card>
      ))}
    </div>
  )
}

/* ================= ESTOQUE SEMÁFORO ================= */
function Estoque({ usuario }) {
  const [materiais, setMateriais] = useState([])
  const [qtd, setQtd] = useState({})
  useEffect(()=>{ carregar() },[])
  async function carregar() {
    const { data: m } = await supabase.from('limpeza_materiais').select('*').eq('ativo', true).order('nome')
    const { data: c } = await supabase.from('limpeza_contagens').select('*').order('data',{ascending:false})
    const ultima = {}
    ;(c||[]).forEach(x => { if(!(x.material_id in ultima)) ultima[x.material_id]=x })
    setMateriais((m||[]).map(x => ({...x, ultima: ultima[x.id]})))
  }
  function status(m) {
    const q = m.ultima?.quantidade
    if (q==null) return {cor:'bg-gray-200 text-gray-600', label:'sem contagem', s:'cinza'}
    if (q <= 0) return {cor:'bg-red-600 text-white', label:'🔴 ACABOU', s:'vermelho'}
    if (q <= m.estoque_minimo*0.5) return {cor:'bg-red-100 text-red-800', label:'🔴 crítico', s:'vermelho'}
    if (q <= m.estoque_minimo) return {cor:'bg-yellow-100 text-yellow-800', label:'🟡 alerta', s:'amarelo'}
    return {cor:'bg-green-100 text-green-800', label:'🟢 ok', s:'verde'}
  }
  async function registrar(m) {
    const q = parseFloat(qtd[m.id])
    if (isNaN(q)) return
    await supabase.from('limpeza_contagens').insert({ material_id:m.id, data:hoje(), quantidade:q, registrado_por:usuario })
    setQtd({...qtd,[m.id]:''}); carregar()
  }
  const alertas = materiais.filter(m => ['amarelo','vermelho'].includes(status(m).s))
  function avisarSecretaria() {
    const linhas = alertas.map(m => `• ${m.nome}: ${m.ultima?.quantidade ?? '?'} ${m.unidade} (mínimo ${m.estoque_minimo})`).join('%0A')
    const txt = `🟡🔴 ALERTA DE MATERIAL DE LIMPEZA — ${fmt(hoje())}%0AItens no ponto de reposição:%0A${linhas}%0AFavor solicitar reposição à SME. (Enviado pela plataforma Limpeza & Materiais)`
    window.open(`https://wa.me/${WHATSAPP_ESCOLA}?text=${txt}`,'_blank')
  }
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Titulo>🟢🟡🔴 Estoque de material</Titulo>
          {alertas.length>0 && (
            <button onClick={avisarSecretaria} className="bg-yellow-400 text-yellow-900 font-extrabold rounded-xl px-4 py-2 display">
              ⚠ Avisar secretaria ({alertas.length})
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600">Contagem toda sexta-feira. Ao atingir o estoque mínimo (🟡), a secretaria é avisada — sem esperar acabar.</p>
      </Card>
      <div className="grid md:grid-cols-2 gap-3">
        {materiais.map(m => { const st = status(m); return (
          <Card key={m.id}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold">{m.nome}</p>
                <p className="text-xs text-gray-500">mín.: {m.estoque_minimo} {m.unidade}
                  {m.ultima && <> • última contagem: {m.ultima.quantidade} em {fmt(m.ultima.data)}</>}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${st.cor}`}>{st.label}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <input type="number" step="any" value={qtd[m.id]||''} onChange={e=>setQtd({...qtd,[m.id]:e.target.value})}
                placeholder={`Qtde hoje (${m.unidade})`} className="flex-1 border rounded-lg px-3 py-1.5 text-sm"/>
              <button onClick={()=>registrar(m)} className="text-sm bg-[#1F4E79] text-white rounded-lg px-3 font-bold">Registrar</button>
            </div>
          </Card>
        )})}
      </div>
    </div>
  )
}

/* ================= FICHAS (SUPERVISORA E SENTINELAS) ================= */
const ITENS_VERIF = {
  1: ['Salas do 1º turno entregues limpas às 8h','Banheiros dos alunos limpos e abastecidos','Guardiã em ronda / presente no posto','Refeitório atendido no desjejum','Varrição das externas em andamento','Janelas das salas com mofo abertas','Bomba d\u2019água ligada/verificada'],
  2: ['Limpeza das 12h: cada ASG nas PRÓPRIAS salas','Banheiros em limpeza (masculino sem alunos)','Refeitório entregue limpo às 12h','Merenda/almoço do 1º turno atendida','Administrativas do dia executadas','Ocorrências da manhã registradas'],
  3: ['Almoço do 2º turno atendido em dupla','Guardiã da tarde em ronda','Lanche com refeitório atendido','Pontos de atenção executados','Antecipação de salas em andamento','Janelas das salas com mofo fechadas','Varrição da tarde em andamento'],
}
function FichaSupervisora() {
  const [data, setData] = useState(hoje())
  const [verif, setVerif] = useState(1)
  const [marc, setMarc] = useState({})
  const [notas, setNotas] = useState('')
  const [historico, setHistorico] = useState([])
  useEffect(()=>{ carregarDia() },[data, verif])
  async function carregarDia() {
    const { data: h } = await supabase.from('limpeza_monitoramentos').select('*').eq('data', data).order('verificacao')
    setHistorico(h||[])
    const atual = (h||[]).find(x=>x.verificacao===verif)
    setMarc(atual?.itens||{}); setNotas(atual?.pendencias||'')
  }
  async function salvar() {
    const existente = historico.find(x=>x.verificacao===verif)
    const payload = { data, verificacao:verif, itens:marc, pendencias:notas, hora_real:new Date().toTimeString().slice(0,5) }
    if (existente) await supabase.from('limpeza_monitoramentos').update(payload).eq('id', existente.id)
    else await supabase.from('limpeza_monitoramentos').insert(payload)
    carregarDia(); alert('Verificação salva!')
  }
  const itens = ITENS_VERIF[verif]
  return (
    <Card>
      <Titulo>📋 Ficha da Supervisora</Titulo>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input type="date" value={data} onChange={e=>setData(e.target.value)} className="border rounded-lg px-3 py-2"/>
        {[1,2,3].map(v => (
          <button key={v} onClick={()=>setVerif(v)}
            className={`rounded-xl px-4 py-2 font-bold ${verif===v?'bg-[#1F4E79] text-white':'bg-gray-100'}`}>
            {v===1?'9h30':v===2?'12h30':'15h30'} {historico.find(x=>x.verificacao===v)?'✓':''}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {itens.map((it,i)=>(
          <label key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
            <input type="checkbox" checked={!!marc[it]} onChange={e=>setMarc({...marc,[it]:e.target.checked})} className="w-5 h-5"/>
            <span className="text-sm">{it}</span>
          </label>
        ))}
      </div>
      <textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Faltas do dia, redistribuição feita, pendências…" className="border rounded-lg px-3 py-2 w-full mt-3" rows={2}/>
      <button onClick={salvar} className="mt-3 bg-[#1F4E79] text-white font-bold rounded-xl px-5 py-2.5">Salvar verificação</button>
    </Card>
  )
}
function FichaSentinelas({ usuario }) {
  const [lista, setLista] = useState([])
  const [f, setF] = useState({ local:'', problema:'', urgencia:'baixa' })
  useEffect(()=>{ carregar() },[])
  async function carregar() {
    const { data } = await supabase.from('limpeza_vistorias').select('*').order('criada_em',{ascending:false}).limit(50)
    setLista(data||[])
  }
  async function salvar() {
    if (!f.local || !f.problema) return alert('Informe local e problema.')
    await supabase.from('limpeza_vistorias').insert({ ...f, data: hoje(), registrado_por: usuario })
    if (f.urgencia==='alta') {
      const txt = `🔍 SENTINELAS DO PATRIMÔNIO — URGÊNCIA ALTA%0ALocal: ${f.local}%0AProblema: ${f.problema}%0AData: ${fmt(hoje())} • ${usuario}`
      window.open(`https://wa.me/${WHATSAPP_ESCOLA}?text=${txt}`,'_blank')
    }
    setF({ local:'', problema:'', urgencia:'baixa' }); carregar()
  }
  async function resolver(v) {
    await supabase.from('limpeza_vistorias').update({ resolvida: !v.resolvida }).eq('id', v.id); carregar()
  }
  const corU = { baixa:'bg-green-100 text-green-800', media:'bg-yellow-100 text-yellow-800', alta:'bg-red-100 text-red-800' }
  return (
    <Card>
      <Titulo>🔍 Ficha de Vistoria — Sentinelas do Patrimônio</Titulo>
      <p className="text-sm text-gray-600 mb-2">Rondas de terça e quinta (10h–11h). Urgência ALTA abre o WhatsApp da escola automaticamente.</p>
      <div className="grid md:grid-cols-3 gap-2">
        <input value={f.local} onChange={e=>setF({...f,local:e.target.value})} placeholder="Local" className="border rounded-lg px-3 py-2"/>
        <input value={f.problema} onChange={e=>setF({...f,problema:e.target.value})} placeholder="Problema encontrado" className="border rounded-lg px-3 py-2"/>
        <select value={f.urgencia} onChange={e=>setF({...f,urgencia:e.target.value})} className="border rounded-lg px-3 py-2">
          <option value="baixa">Urgência baixa</option><option value="media">Urgência média</option><option value="alta">Urgência ALTA</option>
        </select>
      </div>
      <button onClick={salvar} className="mt-3 bg-[#1F4E79] text-white font-bold rounded-xl px-5 py-2.5">Registrar achado</button>
      <div className="mt-4 space-y-2">
        {lista.map(v => (
          <div key={v.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${v.resolvida?'bg-green-50 opacity-70':'bg-gray-50'}`}>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${corU[v.urgencia]}`}>{v.urgencia.toUpperCase()}</span>
            <span className="text-sm"><b>{v.local}</b> — {v.problema} <span className="text-gray-500">({fmt(v.data)})</span></span>
            <button onClick={()=>resolver(v)} className="ml-auto text-xs border rounded-lg px-2 py-1">{v.resolvida?'Reabrir':'Resolvido ✓'}</button>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ================= APP ================= */
export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [aba, setAba] = useState('rotina')
  const nomes = ['João','Igor','Ana','Ivani','Daniela','Supervisora']
  const abas = usuario==='Supervisora'
    ? [['fichaS','📋 Monitoramento'],['estoque','🟢 Estoque'],['ocorr','📸 Ocorrências'],['vistoria','🔍 Vistorias']]
    : [['rotina','🕐 Rotina'],['ocorr','📸 Ocorrências'],['estoque','🟢 Estoque'],['vistoria','🔍 Sentinelas']]
  useEffect(()=>{ if(usuario==='Supervisora') setAba('fichaS'); else setAba('rotina') },[usuario])
  if (!usuario) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="display text-3xl font-extrabold text-[#1F4E79] text-center">🧹 Limpeza & Materiais</h1>
      <p className="text-gray-600 mb-6 text-center">E.M. Regina Celi da Silva Cerdeira • Quem é você?</p>
      <div className="flex flex-wrap gap-3 justify-center max-w-md">
        {nomes.map(n => <Chip key={n} nome={n} ativo onClick={()=>setUsuario(n)}/>)}
      </div>
    </div>
  )
  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-10 bg-white shadow px-4 py-3 flex items-center gap-3">
        <h1 className="display font-extrabold text-[#1F4E79]">🧹 Limpeza & Materiais</h1>
        <span className="ml-auto text-sm font-bold px-3 py-1 rounded-full text-white" style={{background:CORES[usuario]}}>{usuario}</span>
        <button onClick={()=>setUsuario(null)} className="text-sm text-gray-500 underline">trocar</button>
      </header>
      <nav className="flex gap-2 overflow-x-auto px-4 py-3">
        {abas.map(([id,label]) => (
          <button key={id} onClick={()=>setAba(id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 font-bold text-sm ${aba===id?'bg-[#1F4E79] text-white':'bg-white shadow'}`}>{label}</button>
        ))}
      </nav>
      <main className="px-4 max-w-3xl mx-auto">
        {aba==='rotina' && <Rotina usuario={usuario}/>}
        {aba==='ocorr' && <Ocorrencias usuario={usuario}/>}
        {aba==='estoque' && <Estoque usuario={usuario}/>}
        {aba==='fichaS' && <FichaSupervisora/>}
        {aba==='vistoria' && <FichaSentinelas usuario={usuario}/>}
      </main>
    </div>
  )
}
