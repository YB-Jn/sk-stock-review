return {
  inject: ['timer'],
  apply(ctx) {
    const store = { open: false, subs: [] }
    const setOpen = (v) => {
      store.open = !!v
      for (const f of store.subs.slice()) { try { f(store.open) } catch (e) {} }
    }
    const useOpen = () => {
      const [v, setV] = React.useState(store.open)
      React.useEffect(() => {
        store.subs.push(setV)
        return () => { const i = store.subs.indexOf(setV); if (i >= 0) store.subs.splice(i, 1) }
      }, [])
      return v
    }
    const useThemeDark = () => {
      const [dark, setDark] = React.useState(false)
      React.useEffect(() => {
        let alive = true
        const apply = (snap) => {
          let d = false
          try {
            const active = snap && (snap.active || {})
            const cs = String((active && active.colorScheme) || '')
            const id = String((active && active.id) || '')
            d = /dark/i.test(cs) || /dark/i.test(id)
          } catch (e) {}
          if (alive) setDark(d)
        }
        try {
          const theme = ctx.get('theme')
          if (theme) {
            apply(theme.getTheme())
            return ctx.on('theme/change', apply)
          }
        } catch (e) {}
        return () => { alive = false }
      }, [])
      return dark
    }

    styles.insert(`
.dsr-theme{--dsr-pk:var(--dsw-alias-brand-primary,#6d28d9);--dsr-up:var(--dsw-alias-state-error-primary,#e03131);--dsr-down:var(--dsw-alias-state-success-primary,#0ca678);--dsr-warn:var(--dsw-alias-state-warn-primary,#d97706);--dsr-blue:#3b82f6;--dsr-bg:var(--dsw-alias-bg-overlay,#ffffff);--dsr-bg1:var(--dsw-alias-bg-layer-1,#f7f8fa);--dsr-bg2:var(--dsw-alias-bg-layer-2,#e9ecf1);--dsr-line:var(--dsw-alias-border-l1,rgba(31,35,41,.1));--dsr-line2:var(--dsw-alias-border-l2,rgba(31,35,41,.18));--dsr-t1:var(--dsw-alias-label-primary,#1f2329);--dsr-t2:var(--dsw-alias-label-secondary,#576070);--dsr-mut:color-mix(in srgb,var(--dsr-t2) 72%,transparent)}
.dsr-theme.dsr-dark{--dsr-pk:#a78bfa;--dsr-up:#f87171;--dsr-down:#34d399;--dsr-warn:#fbbf24;--dsr-blue:#60a5fa;--dsr-bg:#141824;--dsr-bg1:#1c2234;--dsr-bg2:#262e46;--dsr-line:rgba(148,163,184,.15);--dsr-line2:rgba(148,163,184,.28);--dsr-t1:#e9ecf5;--dsr-t2:#a9b3cc;--dsr-mut:color-mix(in srgb,var(--dsr-t2) 72%,transparent)}
.dsr-ov{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(1180px,calc(100vw - 40px));max-height:calc(100vh - 48px);display:flex;flex-direction:column;border-radius:20px;background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--dsr-pk) 11%,transparent),transparent 55%),var(--dsr-bg);color:var(--dsr-t1);border:1px solid color-mix(in srgb,var(--dsr-pk) 32%,var(--dsr-line2));box-shadow:0 32px 90px rgba(0,0,0,.34),0 4px 18px rgba(0,0,0,.18);z-index:9999;font-family:system-ui,-apple-system,'Segoe UI','Microsoft YaHei',sans-serif;overflow:hidden;pointer-events:auto;font-size:13px;line-height:1.55;font-variant-numeric:tabular-nums}
.dsr-ov.dsr-full{top:0;left:0;transform:none;width:100vw;height:100vh;max-height:none;border-radius:0}
.dsr-theme.dsr-dark .dsr-stat{background:linear-gradient(180deg,rgba(139,92,246,.12),rgba(139,92,246,.02))}
.dsr-theme.dsr-dark .dsr-conc-card{background:linear-gradient(180deg,rgba(139,92,246,.14),rgba(139,92,246,.02))}
.dsr-theme.dsr-dark .dsr-ladder-h{background:linear-gradient(90deg,rgba(139,92,246,.16),transparent)}
.dsr-theme.dsr-dark .dsr-head{background:linear-gradient(120deg,rgba(139,92,246,.16),transparent 62%)}
.dsr-fab{position:fixed;left:18px;bottom:18px;z-index:9990;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--dsr-pk),color-mix(in srgb,var(--dsr-pk) 70%,#000));color:#fff;border:none;border-radius:26px;padding:11px 20px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all .18s;pointer-events:auto}
.dsr-fab:hover{transform:translateY(-2px);box-shadow:0 14px 38px rgba(0,0,0,.42);filter:brightness(1.08)}
.dsr-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--dsr-line);background:linear-gradient(120deg,color-mix(in srgb,var(--dsr-pk) 12%,transparent),transparent 62%)}
.dsr-title{font-size:16.5px;font-weight:800;letter-spacing:.3px;display:flex;align-items:center;gap:10px;color:var(--dsr-t1)}
.dsr-date{font-size:12.5px;font-weight:700;color:var(--dsr-pk);background:color-mix(in srgb,var(--dsr-pk) 14%,transparent);padding:2.5px 12px;border-radius:20px;border:1px solid color-mix(in srgb,var(--dsr-pk) 26%,transparent)}
.dsr-actions{margin-left:auto;display:flex;gap:8px}
.dsr-btn{background:var(--dsr-bg2);border:1px solid var(--dsr-line2);color:var(--dsr-t1);border-radius:10px;padding:6px 14px;font-size:12.5px;cursor:pointer;font-family:inherit;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
.dsr-btn:hover{border-color:var(--dsr-pk);color:var(--dsr-pk);background:color-mix(in srgb,var(--dsr-pk) 10%,transparent)}
.dsr-btn:disabled{opacity:.5;cursor:default}
.dsr-btn.primary{background:var(--dsr-pk);color:#fff;border-color:transparent;font-weight:600}
.dsr-btn.primary:hover{filter:brightness(1.1);color:#fff}
.dsr-btn.ghost{background:transparent;border-color:transparent}
.dsr-toast{padding:7px 18px;font-size:12px;color:var(--dsr-down);background:color-mix(in srgb,var(--dsr-down) 12%,transparent);border-bottom:1px solid color-mix(in srgb,var(--dsr-down) 22%,transparent)}
.dsr-error{padding:14px 18px;color:var(--dsr-up);background:color-mix(in srgb,var(--dsr-up) 10%,transparent);display:flex;align-items:center;gap:10px;font-size:13px;border-bottom:1px solid color-mix(in srgb,var(--dsr-up) 20%,transparent)}
.dsr-loading{padding:46px;text-align:center;color:var(--dsr-mut)}
.dsr-body{flex:1;overflow-y:auto;padding:14px 18px 16px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;scrollbar-color:var(--dsr-line2) transparent}
.dsr-body::-webkit-scrollbar{width:8px}
.dsr-body::-webkit-scrollbar-thumb{background:var(--dsr-line2);border-radius:4px}
.dsr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.dsr-stat{position:relative;border:1px solid color-mix(in srgb,var(--dsr-pk) 24%,var(--dsr-line));border-radius:14px;padding:11px 14px 11px 17px;background:linear-gradient(180deg,color-mix(in srgb,var(--dsr-pk) 8%,transparent),transparent);overflow:hidden}
.dsr-stat::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--dsr-pk);opacity:.9}
.dsr-stat-label{font-size:12px;color:var(--dsr-t2)}
.dsr-stat-value{font-size:22px;font-weight:800;margin-top:2px;letter-spacing:.2px}
.dsr-tabs{display:flex;gap:2px;border-bottom:1px solid var(--dsr-line);padding:0 4px}
.dsr-tab{background:none;border:none;padding:9px 16px;cursor:pointer;font-size:13px;color:var(--dsr-t2);font-family:inherit;position:relative;font-weight:500;transition:color .15s}
.dsr-tab:hover{color:var(--dsr-pk)}
.dsr-tab.on{color:var(--dsr-pk);font-weight:700}
.dsr-tab.on::after{content:'';position:absolute;left:14px;right:14px;bottom:-1px;height:2.5px;border-radius:2px;background:var(--dsr-pk)}
.dsr-pane{display:flex;flex-direction:column;gap:12px}
.dsr-sec{border:1px solid var(--dsr-line);border-radius:14px;overflow:hidden;background:var(--dsr-bg)}
.dsr-sec-h{display:flex;align-items:center;gap:8px;padding:9px 14px;font-weight:700;font-size:13px;border-bottom:1px solid var(--dsr-line);background:var(--dsr-bg1)}
.dsr-sec-h .dot{width:8px;height:8px;border-radius:50%}
.dsr-sec-h .cnt{font-weight:400;font-size:12px;color:var(--dsr-mut);margin-left:auto}
.dsr-row{display:flex;align-items:center;gap:10px;padding:7px 14px;border-bottom:1px solid color-mix(in srgb,var(--dsr-line) 55%,transparent)}
.dsr-row:last-child{border-bottom:none}
.dsr-row:hover{background:color-mix(in srgb,var(--dsr-pk) 6%,transparent)}
.dsr-name{font-weight:600;white-space:nowrap;color:var(--dsr-t1)}
.dsr-code{font-size:11.5px;color:var(--dsr-mut)}
.dsr-badge{font-size:11px;padding:1.5px 9px;border-radius:20px;white-space:nowrap;font-weight:600;border:1px solid transparent}
.bd-up{color:var(--dsr-up);background:color-mix(in srgb,var(--dsr-up) 15%,transparent);border-color:color-mix(in srgb,var(--dsr-up) 26%,transparent)}
.bd-down{color:var(--dsr-down);background:color-mix(in srgb,var(--dsr-down) 15%,transparent);border-color:color-mix(in srgb,var(--dsr-down) 26%,transparent)}
.bd-brand{color:var(--dsr-pk);background:color-mix(in srgb,var(--dsr-pk) 15%,transparent);border-color:color-mix(in srgb,var(--dsr-pk) 28%,transparent)}
.bd-blue{color:var(--dsr-blue);background:color-mix(in srgb,var(--dsr-blue) 14%,transparent);border-color:color-mix(in srgb,var(--dsr-blue) 26%,transparent)}
.bd-amber{color:var(--dsr-warn);background:color-mix(in srgb,var(--dsr-warn) 15%,transparent);border-color:color-mix(in srgb,var(--dsr-warn) 26%,transparent)}
.bd-gray{color:var(--dsr-t2);background:color-mix(in srgb,var(--dsr-t2) 14%,transparent);border-color:color-mix(in srgb,var(--dsr-t2) 24%,transparent)}
.dsr-seal{font-weight:800;white-space:nowrap;color:var(--dsr-up)}
.dsr-rank{font-size:11px;color:var(--dsr-up);background:color-mix(in srgb,var(--dsr-up) 12%,transparent);padding:1.5px 9px;border-radius:20px;white-space:nowrap;font-weight:600}
.dsr-reason{color:var(--dsr-t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.dsr-delta{font-size:12px;color:var(--dsr-mut);white-space:nowrap}
.dsr-empty{padding:20px;text-align:center;color:var(--dsr-mut);font-size:12.5px}
.dsr-ladder-g{border:1px solid var(--dsr-line);border-radius:14px;overflow:hidden;background:var(--dsr-bg)}
.dsr-ladder-h{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--dsr-line);background:linear-gradient(90deg,color-mix(in srgb,var(--dsr-pk) 11%,transparent),transparent)}
.dsr-ladder-h .board{font-weight:800;font-size:15px;color:var(--dsr-pk)}
.dsr-ladder-h .cnt{font-size:12px;color:var(--dsr-mut)}
.dsr-ladder-h .tip{font-size:11.5px;color:var(--dsr-mut);margin-left:auto}
.dsr-stk{display:flex;align-items:flex-start;gap:10px;padding:9px 14px;border-bottom:1px solid color-mix(in srgb,var(--dsr-line) 55%,transparent)}
.dsr-stk:last-child{border-bottom:none}
.dsr-stk:hover{background:color-mix(in srgb,var(--dsr-pk) 5%,transparent)}
.dsr-stk-main{flex:1;min-width:0}
.dsr-stk-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsr-stk-reason{margin-top:3px;color:var(--dsr-t2);font-size:12.5px}
.dsr-mk{font-size:11px;background:color-mix(in srgb,var(--dsr-pk) 12%,transparent);color:var(--dsr-pk);padding:1.5px 9px;border-radius:20px;white-space:nowrap;font-weight:600}
.dsr-stk-meta{font-size:12px;color:var(--dsr-mut);margin-top:4px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.dsr-stk-meta .up{color:var(--dsr-up);font-weight:700}
.dsr-conc{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.dsr-conc-card{border:1px solid color-mix(in srgb,var(--dsr-pk) 28%,var(--dsr-line));border-radius:16px;padding:18px 10px;text-align:center;background:linear-gradient(180deg,color-mix(in srgb,var(--dsr-pk) 9%,transparent),transparent)}
.dsr-conc-name{font-weight:700;font-size:14px;color:var(--dsr-t1)}
.dsr-conc-pct{font-size:21px;font-weight:800;margin-top:6px;color:var(--dsr-up)}
.dsr-conc-sub{font-size:12px;color:var(--dsr-mut);margin-top:8px}
.dsr-chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dsr-chart-card{border:1px solid var(--dsr-line);border-radius:14px;padding:12px 14px;background:var(--dsr-bg)}
.dsr-chart-title{font-size:13px;font-weight:700;color:var(--dsr-t1);margin-bottom:8px;display:flex;align-items:center;gap:8px}
.dsr-chart-title .tag{font-size:11px;color:var(--dsr-mut);font-weight:400;margin-left:auto}
.dsr-legend{display:flex;gap:14px;font-size:11px;color:var(--dsr-t2);margin-top:6px;justify-content:center}
.dsr-legend .li{display:flex;align-items:center;gap:5px}
.dsr-legend .sw{width:14px;height:3px;border-radius:2px}
.dsr-tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.dsr-tbl th,.dsr-tbl td{padding:7px 10px;border-bottom:1px solid var(--dsr-line);text-align:center}
.dsr-tbl th{font-weight:600;color:var(--dsr-mut);font-size:11.5px}
.dsr-tbl tr:last-child td{border-bottom:none}
.dsr-foot{padding:8px 18px;font-size:11.5px;color:var(--dsr-mut);border-top:1px solid var(--dsr-line);background:var(--dsr-bg1)}
.dsr-runcard{display:flex;align-items:center;gap:12px;padding:10px 14px;flex-wrap:wrap;color:var(--dsw-alias-label-primary,#1f2329)}
.dsr-runcard .t{font-weight:800;color:var(--dsw-alias-brand-primary,#6d28d9)}
.dsr-runcard .c{font-size:12px;color:var(--dsw-alias-label-secondary,#576070)}
.dsr-btn-mini{background:none;border:1px solid var(--dsw-alias-brand-primary,#6d28d9);color:var(--dsw-alias-brand-primary,#6d28d9);border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;font-family:inherit}
.dsr-btn-mini:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#6d28d9) 10%,transparent)}
`)

    const h = React.createElement
    const fmtSeal = (n) => { n = Number(n) || 0; if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿'; if (n >= 1e4) return Math.round(n / 1e4) + '万'; return String(Math.round(n)) }
    const fmtPct = (p) => { const v = Number(p); if (!Number.isFinite(v)) return '—'; return (v > 0 ? '+' : '') + v.toFixed(2) + '%' }
    const fmtTime = (ms) => { if (!ms) return ''; const d = new Date(ms + 8 * 3600 * 1000); const p = (x) => (x < 10 ? '0' + x : '' + x); return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) }
    const typeBadge = (t) => t === '一字板' ? h('span', { className: 'dsr-badge bd-brand' }, '一字板') : t === 'T字板' ? h('span', { className: 'dsr-badge bd-amber' }, 'T字板') : t === '换手板' ? h('span', { className: 'dsr-badge bd-blue' }, '换手板') : null
    const volBadge = (v) => v === '放量晋级' ? h('span', { className: 'dsr-badge bd-up' }, '放量晋级') : v === '缩量晋级' ? h('span', { className: 'dsr-badge bd-blue' }, '缩量晋级') : v === '平量晋级' ? h('span', { className: 'dsr-badge bd-gray' }, '平量晋级') : null
    const sealBadge = (t) => t === '竞价' ? h('span', { className: 'dsr-badge bd-brand' }, '竞价封单') : h('span', { className: 'dsr-badge bd-gray' }, '收盘封单')

    function useReviewData() {
      const [tick, setTick] = React.useState(0)
      const [force, setForce] = React.useState(0)
      const [state, setState] = React.useState({ loading: false, data: null, error: null })
      React.useEffect(() => {
        let alive = true
        setState((s) => ({ ...s, loading: true }))
        host.call('review:get', { force: force > 0 }).then((res) => {
          if (!alive) return
          if (res && res.ok) setState({ loading: false, data: res.data, error: null })
          else setState({ loading: false, data: null, error: (res && res.error) || '未知错误' })
        }).catch((e) => { if (alive) setState({ loading: false, data: null, error: String((e && e.message) || e) }) })
        return () => { alive = false }
      }, [tick, force])
      React.useEffect(() => {
        const dis = ctx.interval(() => setTick((t) => t + 1), 5 * 60 * 1000)
        return () => { try { dis() } catch (e) {} }
      }, [])
      return { ...state, refresh: () => setForce((f) => f + 1) }
    }

    function LineChart(props) {
      const series = props.series || []
      const height = props.height || 180
      const width = props.width || 520
      const padL = 8, padR = 8, padT = 20, padB = 22
      const n = series.length ? (series[0].points || []).length : 0
      if (!n) return h('div', { className: 'dsr-empty' }, '暂无数据')
      let maxV = 1
      for (const s of series) for (const p of s.points) maxV = Math.max(maxV, p.value)
      maxV = maxV * 1.12
      const iw = width - padL - padR, ih = height - padT - padB
      const xAt = (i) => padL + (n <= 1 ? iw / 2 : iw * i / (n - 1))
      const yAt = (v) => padT + ih - (v / maxV) * ih
      const els = []
      for (let g = 0; g <= 3; g++) {
        const y = padT + ih * g / 3
        els.push(h('line', { key: 'g' + g, x1: padL, y1: y, x2: width - padR, y2: y, style: { stroke: 'var(--dsr-line)' }, strokeWidth: 1 }))
        els.push(h('text', { key: 'gt' + g, x: width - padR - 2, y: y + 3, fontSize: 9, style: { fill: 'var(--dsr-mut)' }, textAnchor: 'end' }, String(Math.round(maxV * (1 - g / 3)))))
      }
      series.forEach((s, si) => {
        const pts = s.points.map((p, i) => [xAt(i), yAt(p.value)])
        const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
        els.push(h('path', { key: 'p' + si, d: d, fill: 'none', style: { stroke: s.color || 'var(--dsr-pk)' }, strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round' }))
        pts.forEach((p, i) => {
          els.push(h('circle', { key: 'c' + si + '_' + i, cx: p[0], cy: p[1], r: 3, style: { fill: 'var(--dsr-bg)', stroke: s.color || 'var(--dsr-pk)' }, strokeWidth: 2 }))
          els.push(h('text', { key: 'v' + si + '_' + i, x: p[0], y: p[1] - 8, fontSize: 9.5, style: { fill: 'var(--dsr-t2)' }, textAnchor: 'middle' }, String(s.points[i].value)))
        })
      })
      const first = series[0]
      first.points.forEach((p, i) => els.push(h('text', { key: 'x' + i, x: xAt(i), y: height - 6, fontSize: 10, style: { fill: 'var(--dsr-mut)' }, textAnchor: 'middle' }, p.label)))
      return h('svg', { width: '100%', viewBox: '0 0 ' + width + ' ' + height, preserveAspectRatio: 'xMidYMid meet', style: { display: 'block' } }, els)
    }

    function BarChart(props) {
      const items = props.items || []
      const color = props.color || 'var(--dsr-pk)'
      const height = props.height || 170
      if (!items.length) return h('div', { className: 'dsr-empty' }, '暂无数据')
      const maxV = Math.max(1, Math.max.apply(null, items.map((i) => i.value))) * 1.15
      return h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: height, padding: '0 6px', borderBottom: '1px solid var(--dsr-line)' } },
        items.map((it) => h('div', { key: it.label, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 30 } },
          h('span', { style: { fontSize: 10, color: 'var(--dsr-t2)', marginBottom: 4 } }, String(it.value)),
          h('div', { style: { width: 22, height: Math.max(3, Math.round((it.value / maxV) * (height - 36))), borderRadius: '5px 5px 0 0', background: 'linear-gradient(180deg,' + color + ',color-mix(in srgb,' + color + ' 70%,transparent))' } }),
          h('span', { style: { fontSize: 10, color: 'var(--dsr-mut)', marginTop: 6 } }, it.label)
        ))
      )
    }

    function PctBars(props) {
      const items = props.items || []
      const height = props.height || 170
      if (!items.length) return h('div', { className: 'dsr-empty' }, '暂无数据')
      const maxA = Math.max(1, Math.max.apply(null, items.map((i) => Math.abs(i.value))))
      const mid = height / 2
      return h('div', { style: { position: 'relative', height: height, margin: '0 8px', borderBottom: '1px solid var(--dsr-line)', borderTop: '1px solid var(--dsr-line)' } },
        h('div', { style: { position: 'absolute', top: mid, left: 0, right: 0, height: 1, background: 'var(--dsr-line2)' } }),
        h('div', { style: { display: 'flex', justifyContent: 'space-around', position: 'absolute', inset: 0 } },
          items.map((it) => {
            const isPos = it.value >= 0
            const bh = Math.max(2, Math.round((Math.abs(it.value) / maxA) * (mid - 26)))
            const top = isPos ? mid - bh : mid
            return h('div', { key: it.label, style: { position: 'relative', width: 40, height: '100%' } },
              h('div', { style: { position: 'absolute', top: top, left: '50%', transform: 'translateX(-50%)', width: 20, height: bh, borderRadius: 3, background: isPos ? 'var(--dsr-up)' : 'var(--dsr-down)', opacity: .85 } }),
              h('span', { style: { position: 'absolute', top: isPos ? top - 15 : top + bh + 3, left: 0, right: 0, textAlign: 'center', fontSize: 9.5, color: isPos ? 'var(--dsr-up)' : 'var(--dsr-down)' } }, (it.value > 0 ? '+' : '') + it.value.toFixed(2)),
              h('span', { style: { position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'var(--dsr-mut)' } }, it.label)
            )
          })
        )
      )
    }

    function ChartCard(props) {
      return h('div', { className: 'dsr-chart-card' }, h('div', { className: 'dsr-chart-title' }, props.title, h('span', { className: 'tag' }, props.tag || '')), props.children)
    }

    function OneWordRow(props) {
      const it = props.it
      const showDelta = props.showDelta
      const delta = it.prevSeal > 0 ? h('span', { className: 'dsr-delta' }, '昨日 ' + fmtSeal(it.prevSeal) + ' → ' + fmtSeal(it.seal)) : null
      const label = it.prevBoards > 0 && it.boards > it.prevBoards ? it.prevBoards + '进' + it.boards : (it.boards > 1 ? it.boards + '板' : null)
      return h('div', { className: 'dsr-row' },
        h('span', { className: 'dsr-name' }, it.name),
        h('span', { className: 'dsr-code' }, it.code),
        label ? h('span', { className: 'dsr-badge bd-brand' }, label) : null,
        h('span', { className: 'dsr-seal' }, fmtSeal(it.seal)),
        sealBadge(it.sealTag),
        it.rankText ? h('span', { className: 'dsr-rank' }, it.rankText) : null,
        h('span', { className: 'dsr-reason' }, it.reason || '—'),
        showDelta ? delta : null
      )
    }

    function OneWordView(props) {
      const d = props.d
      const sections = [
        { key: 'up', label: '连板加单一字', dot: 'var(--dsr-up)' },
        { key: 'added', label: '新增一字', dot: 'var(--dsr-pk)' },
        { key: 'first', label: '首板一字', dot: 'var(--dsr-blue)' },
        { key: 'tShape', label: 'T字（竞价封单强）', dot: 'var(--dsr-warn)' },
        { key: 'down', label: '一字封单减弱', dot: 'var(--dsr-down)' },
        { key: 'flat', label: '一字封单持平', dot: 'var(--dsr-mut)' }
      ]
      return h('div', { className: 'dsr-pane' }, sections.map((s) =>
        h('div', { key: s.key, className: 'dsr-sec' },
          h('div', { className: 'dsr-sec-h' }, h('span', { className: 'dot', style: { background: s.dot } }), s.label, h('span', { className: 'cnt' }, d.oneWord[s.key].length + ' 只')),
          d.oneWord[s.key].length ? d.oneWord[s.key].map((it) => h(OneWordRow, { key: it.code, it: it, showDelta: s.key === 'up' || s.key === 'down' })) : h('div', { className: 'dsr-empty' }, '今日无')
        )
      ))
    }

    function LadderView(props) {
      const d = props.d
      if (!d.ladder.length) return h('div', { className: 'dsr-empty' }, '今日无 ≥2 连续涨停个股')
      return h('div', { className: 'dsr-pane' }, d.ladder.map((g) =>
        h('div', { key: g.boards, className: 'dsr-ladder-g' },
          h('div', { className: 'dsr-ladder-h' }, h('span', { className: 'board' }, g.boards + ' 连板'), h('span', { className: 'cnt' }, g.stocks.length + ' 只'), h('span', { className: 'tip' }, g.boards === d.totals.maxBoards ? '★ 当日最高' : '高度压制')),
          g.stocks.map((it) => {
            const delta = it.prevSeal > 0 ? h('span', null, '昨日封单 ' + fmtSeal(it.prevSeal) + ' → ' + fmtSeal(it.seal)) : null
            return h('div', { key: it.code, className: 'dsr-stk' },
              h('div', { className: 'dsr-stk-main' },
                h('div', { className: 'dsr-stk-top' },
                  h('span', { className: 'dsr-name' }, it.name),
                  h('span', { className: 'dsr-code' }, it.code),
                  typeBadge(it.type),
                  volBadge(it.volLabel),
                  it.marks.map((m) => h('span', { key: m, className: 'dsr-mk' }, '📌' + m)),
                  it.rankText ? h('span', { className: 'dsr-rank' }, it.rankText) : null
                ),
                h('div', { className: 'dsr-stk-reason' }, it.reason || '—'),
                h('div', { className: 'dsr-stk-meta' },
                  h('span', { className: 'up' }, (it.sealTag === '竞价' ? '竞价封单 ' : '封单 ') + fmtSeal(it.seal)),
                  it.fbt ? h('span', null, '首封 ' + fmtTime(it.fbt)) : null,
                  it.highDays ? h('span', null, it.highDays) : null,
                  it.volRatio ? h('span', null, '量比 ' + it.volRatio) : null,
                  it.openNum > 0 ? h('span', { style: { color: 'var(--dsr-warn)' } }, '炸板' + it.openNum + '次') : null,
                  delta
                )
              )
            )
          })
        )
      ))
    }

    function GapView(props) {
      const d = props.d
      if (!d.gapUp.length) return h('div', { className: 'dsr-empty' }, '今日无断板反包个股')
      return h('div', { className: 'dsr-pane' },
        h('div', { className: 'dsr-sec' },
          h('div', { className: 'dsr-sec-h' }, h('span', { className: 'dot', style: { background: 'var(--dsr-warn)' } }), '断板反包（几天几板）', h('span', { className: 'cnt' }, d.gapUp.length + ' 只')),
          d.gapUp.map((it) => h('div', { key: it.code, className: 'dsr-stk' },
            h('div', { className: 'dsr-stk-main' },
              h('div', { className: 'dsr-stk-top' },
                h('span', { className: 'dsr-name' }, it.name),
                h('span', { className: 'dsr-code' }, it.code),
                typeBadge(it.type),
                h('span', { className: 'dsr-badge bd-amber' }, it.highDays || '—'),
                h('span', { className: 'dsr-badge bd-gray' }, '现连' + it.boards + '板')
              ),
              h('div', { className: 'dsr-stk-reason' }, it.reason || '—'),
              h('div', { className: 'dsr-stk-meta' },
                h('span', { className: 'up' }, (it.sealTag === '竞价' ? '竞价封单 ' : '封单 ') + fmtSeal(it.seal)),
                it.fbt ? h('span', null, '首封 ' + fmtTime(it.fbt)) : null,
                it.openNum > 0 ? h('span', { style: { color: 'var(--dsr-warn)' } }, '炸板' + it.openNum + '次') : null
              )
            )
          ))
        )
      )
    }

    function ConceptView(props) {
      const d = props.d
      return h('div', { className: 'dsr-pane' }, d.concepts.map((c) =>
        h('div', { key: c.code, className: 'dsr-sec' },
          h('div', { className: 'dsr-sec-h' }, h('span', { className: 'dot', style: { background: 'var(--dsr-pk)' } }), c.name, h('span', { className: 'cnt' }, fmtPct(c.pct) + ' · 涨停' + c.ztCount + '家 · 人气TOP5')),
          (c.top5 || []).length ? (c.top5 || []).map((s, i) =>
            h('div', { key: s.code, className: 'dsr-row' },
              h('span', { className: 'dsr-badge bd-gray' }, '#' + (i + 1)),
              h('span', { className: 'dsr-name' }, s.name),
              h('span', { className: 'dsr-code' }, s.code),
              h('span', { className: 'dsr-reason', style: { textAlign: 'right' } }, '成交 ' + fmtSeal(s.amount)),
              h('span', { style: { color: s.pct >= 0 ? 'var(--dsr-up)' : 'var(--dsr-down)', fontWeight: 700, whiteSpace: 'nowrap' } }, fmtPct(s.pct))
            )
          ) : h('div', { className: 'dsr-empty' }, '暂无人气数据')
        )
      ))
    }

    function ChartsView(props) {
      const d = props.d
      const estimated = !!(d.meta && d.meta.source && d.meta.source.indexOf('估算') >= 0)
      const line = d.last7.filter((r) => r.close != null).map((r) => ({ label: r.dateMD, value: r.close }))
      const amt = d.last7.filter((r) => r.amountYI != null).map((r) => ({ label: r.dateMD, value: r.amountYI }))
      const pct = d.last7.filter((r) => r.pct != null).map((r) => ({ label: r.dateMD, value: r.pct }))
      const zt = { name: '涨停', color: 'var(--dsr-up)', points: d.last7.map((r) => ({ label: r.dateMD, value: r.zt == null ? 0 : r.zt })) }
      const dt = { name: '跌停', color: 'var(--dsr-down)', points: d.last7.map((r) => ({ label: r.dateMD, value: r.dt == null ? 0 : r.dt })) }
      return h('div', { className: 'dsr-pane' },
        h('div', { className: 'dsr-chart-grid' },
          h(ChartCard, { title: '上证指数 · 收盘', tag: '近7个交易日' }, h(LineChart, { series: [{ color: 'var(--dsr-pk)', points: line }], height: 176 })),
          h(ChartCard, { title: '上证指数 · 涨跌幅 %', tag: '红涨绿跌' }, h(PctBars, { items: pct, height: 176 })),
          h(ChartCard, { title: '大盘成交额（沪深两市·亿）', tag: estimated ? '量能·估算' : '量能' }, h(BarChart, { items: amt, color: 'var(--dsr-pk)', height: 176 })),
          h(ChartCard, { title: '涨停 / 跌停 家数', tag: '情绪温度' },
            h(LineChart, { series: [zt, dt], height: 176 }),
            h('div', { className: 'dsr-legend' },
              h('span', { className: 'li' }, h('span', { className: 'sw', style: { background: 'var(--dsr-up)' } }), '涨停'),
              h('span', { className: 'li' }, h('span', { className: 'sw', style: { background: 'var(--dsr-down)' } }), '跌停')
            )
          )
        ),
        h('table', { className: 'dsr-tbl' },
          h('thead', null, h('tr', null, ['日期', '上证收盘', '涨跌幅', '大盘成交额(亿)', '涨停', '跌停'].map((t) => h('th', { key: t }, t)))),
          h('tbody', null, d.last7.map((r) => h('tr', { key: r.date },
            h('td', null, r.dateMD),
            h('td', null, r.close == null ? '—' : r.close.toFixed(2)),
            h('td', { style: { color: r.pct >= 0 ? 'var(--dsr-up)' : 'var(--dsr-down)', fontWeight: 600 } }, fmtPct(r.pct)),
            h('td', null, r.amountYI == null ? '—' : r.amountYI),
            h('td', { style: { color: 'var(--dsr-up)', fontWeight: 700 } }, r.zt == null ? '—' : r.zt),
            h('td', { style: { color: 'var(--dsr-down)', fontWeight: 700 } }, r.dt == null ? '—' : r.dt)
          )))
        )
      )
    }

    function Dashboard() {
      const open = useOpen()
      const rev = useReviewData()
      const dark = useThemeDark()
      const [tab, setTab] = React.useState(0)
      const [full, setFull] = React.useState(false)
      const [mdState, setMdState] = React.useState(null)
      if (!open) return null
      const d = rev.data
      const exportMd = () => {
        setMdState('正在生成…')
        host.call('review:markdown', {}).then((res) => {
          setMdState(res && res.ok ? '已写入: ' + res.path : '失败: ' + ((res && res.error) || '未知'))
        }).catch((e) => setMdState('失败: ' + String((e && e.message) || e)))
      }
      const stat = (label, val, color) => h('div', { key: label, className: 'dsr-stat' }, h('div', { className: 'dsr-stat-label' }, label), h('div', { className: 'dsr-stat-value', style: { color: color } }, val == null ? '—' : String(val)))
      const tabs = ['一字板', '连板天梯', '断板反包', '概念TOP3', '近7日']
      return h('div', { className: 'dsr-theme dsr-ov' + (full ? ' dsr-full' : '') + (dark ? ' dsr-dark' : '') },
        h('div', { className: 'dsr-head' },
          h('div', { className: 'dsr-title' }, '📊 SK', d ? h('span', { className: 'dsr-date' }, d.reviewDateMD + ' · ' + d.theme) : null),
          h('div', { className: 'dsr-actions' },
            h('button', { className: 'dsr-btn', onClick: rev.refresh, disabled: rev.loading }, rev.loading ? '加载中…' : '🔄 刷新'),
            h('button', { className: 'dsr-btn', onClick: exportMd, disabled: mdState === '正在生成…' }, '📄 导出MD'),
            h('button', { className: 'dsr-btn', onClick: () => setFull(!full) }, full ? '🗗 还原' : '⛶ 全屏'),
            h('button', { className: 'dsr-btn ghost', onClick: () => setOpen(false) }, '✕')
          )
        ),
        mdState ? h('div', { className: 'dsr-toast' }, mdState) : null,
        rev.error ? h('div', { className: 'dsr-error' }, '数据加载失败: ' + rev.error, h('button', { className: 'dsr-btn', onClick: rev.refresh }, '重试')) : null,
        !d && !rev.error ? h('div', { className: 'dsr-loading' }, '正在拉取行情数据…') : null,
        d ? h('div', { className: 'dsr-body' },
          h('div', { className: 'dsr-stats' },
            stat('涨停家数', d.totals.zt, 'var(--dsr-up)'),
            stat('一字板', d.totals.oneWord, 'var(--dsr-pk)'),
            stat('最高连板', d.totals.maxBoards ? d.totals.maxBoards + ' 板' : '—', 'var(--dsr-pk)'),
            stat('跌停家数', d.totals.dt, 'var(--dsr-down)')
          ),
          h('div', { className: 'dsr-tabs' }, tabs.map((t, i) => h('button', { key: t, className: 'dsr-tab' + (tab === i ? ' on' : ''), onClick: () => setTab(i) }, t))),
          h('div', { className: 'dsr-pane' },
            tab === 0 ? h(OneWordView, { d: d }) : tab === 1 ? h(LadderView, { d: d }) : tab === 2 ? h(GapView, { d: d }) : tab === 3 ? h(ConceptView, { d: d }) : h(ChartsView, { d: d })
          ),
          h('div', { className: 'dsr-foot' },
            '数据日期 ' + d.reviewDateMD + ' · 自动运行 ' + (d.meta && d.meta.nextRunAtText) + ' · 竞价采集 ' + (d.meta && d.meta.nextCaptureText) + ' · ' + (d.meta && d.meta.source) + (d.persistOk === false ? ' · ⚠️本地文件写入受限(仅内存)' : '')
          )
        ) : null
      )
    }

    function SettingsPage() {
      const rev = useReviewData()
      const dark = useThemeDark()
      const d = rev.data
      const [mdMsg, setMdMsg] = React.useState(null)
      const exportMd = () => {
        setMdMsg('正在生成…')
        host.call('review:markdown', {}).then((res) => {
          setMdMsg(res && res.ok ? '已写入: ' + res.path : '失败: ' + ((res && res.error) || '未知'))
        }).catch((e) => setMdMsg('失败: ' + String((e && e.message) || e)))
      }
      const row = (label, value) => h('div', { key: label, style: { display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--dsr-line)', fontSize: 12.5 } }, h('span', { style: { color: 'var(--dsr-t2)' } }, label), h('span', { style: { color: 'var(--dsr-t1)', fontWeight: 600 } }, value == null ? '—' : String(value)))
      return h('div', { className: 'dsr-theme' + (dark ? ' dsr-dark' : ''), style: { padding: '18px 6px', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'system-ui,"Microsoft YaHei",sans-serif' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('span', { style: { fontSize: 19, fontWeight: 800, color: 'var(--dsr-t1)' } }, '📊 SK'),
          d ? h('span', { className: 'dsr-date' }, d.reviewDateMD + ' · ' + d.theme) : null,
          h('span', { style: { fontSize: 12, color: 'var(--dsr-t2)' } }, '股市每日复盘插件')
        ),
        rev.error ? h('div', { className: 'dsr-error' }, '数据加载失败: ' + rev.error) : null,
        h('div', { className: 'dsr-stats', style: { gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' } },
          h('div', { className: 'dsr-stat' }, h('div', { className: 'dsr-stat-label' }, '涨停家数'), h('div', { className: 'dsr-stat-value', style: { color: 'var(--dsr-up)' } }, d ? d.totals.zt : '—')),
          h('div', { className: 'dsr-stat' }, h('div', { className: 'dsr-stat-label' }, '一字板'), h('div', { className: 'dsr-stat-value', style: { color: 'var(--dsr-pk)' } }, d ? d.totals.oneWord : '—')),
          h('div', { className: 'dsr-stat' }, h('div', { className: 'dsr-stat-label' }, '最高连板'), h('div', { className: 'dsr-stat-value', style: { color: 'var(--dsr-pk)' } }, d ? (d.totals.maxBoards || '—') : '—')),
          h('div', { className: 'dsr-stat' }, h('div', { className: 'dsr-stat-label' }, '大盘成交额(亿)'), h('div', { className: 'dsr-stat-value', style: { color: 'var(--dsr-t1)', fontSize: 18 } }, d && d.last7.length ? d.last7[d.last7.length - 1].amountYI : '—'))
        ),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          h('button', { className: 'dsr-btn primary', onClick: () => setOpen(true) }, '📊 打开看板'),
          h('button', { className: 'dsr-btn', onClick: rev.refresh, disabled: rev.loading }, rev.loading ? '加载中…' : '🔄 刷新数据'),
          h('button', { className: 'dsr-btn', onClick: exportMd }, '📄 导出复盘MD')
        ),
        mdMsg ? h('div', { className: 'dsr-toast' }, mdMsg) : null,
        h('div', { className: 'dsr-sec' },
          h('div', { className: 'dsr-sec-h' }, h('span', { className: 'dot', style: { background: 'var(--dsr-pk)' } }), '运行状态'),
          row('数据日期', d && d.reviewDateMD),
          row('自动运行', d && d.meta && d.meta.nextRunAtText),
          row('竞价封单采集', d && d.meta && d.meta.nextCaptureText),
          row('竞价封单状态', d && d.meta && d.meta.auctionCaptured ? '已采集' : '待采集(交易日9:30)'),
          row('本地文件', d && d.persistOk === false ? '⚠️写入受限(仅内存)' : '已持久化')
        ),
        h('div', { className: 'dsr-sec' },
          h('div', { className: 'dsr-sec-h' }, h('span', { className: 'dot', style: { background: 'var(--dsr-blue)' } }), '数据源'),
          row('涨停池/原因/封单', '同花顺'),
          row('概念板块/跌停/成分股', '东方财富'),
          row('指数与个股K线(备用)', '新浪 / 腾讯')
        )
      )
    }

    function RunCard() {
      const rev = useReviewData()
      const d = rev.data
      return h('div', { className: 'dsr-runcard' },
        h('span', { className: 't' }, '📊 SK'),
        rev.loading ? h('span', { className: 'c' }, '加载中…') : null,
        rev.error ? h('span', { className: 'c' }, '加载失败') : null,
        d ? h('span', { className: 'c' }, d.reviewDateMD + ' · 涨停' + d.totals.zt + ' · 一字' + d.totals.oneWord + ' · 最高' + (d.totals.maxBoards || '—') + '连板 · ' + (d.concepts[0] ? d.concepts[0].name + fmtPct(d.concepts[0].pct) : '')) : null,
        h('button', { className: 'dsr-btn-mini', onClick: () => setOpen(true) }, '打开看板')
      )
    }

    function Fab() {
      return h('button', { className: 'dsr-theme dsr-fab' + (useThemeDark() ? ' dsr-dark' : ''), onClick: () => setOpen(!store.open), title: 'SK 股市每日复盘' }, h('span', null, '📊'), h('span', null, 'SK'))
    }

    const slots = ctx.get('slots')
    if (!slots) return
    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'stock-review-fab', order: 2 },
      () => h(Fab, null)
    ))
    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'stock-review-dashboard', order: 5 },
      () => h(Dashboard, null)
    ))
    slots.inject('settings.plugins.tab', () => slots.register(
      { name: 'settings.plugins.tab', id: 'sk', order: 20, label: 'SK' },
      () => h(SettingsPage, null)
    ))
    slots.inject('tool.view.cordis', () => slots.register(
      { name: 'tool.view.cordis', key: 'self' },
      (props) => h(RunCard, props)
    ))
  }
}