return {
  inject: ['timer'],
  apply(ctx) {
    const WORKSPACE = 'D:\\DSH'
    const BASE = 'D:/DSH/.stock-review'
    const SNAP_FILE = BASE + '/snapshot.json'
    const REVIEW_DIR = BASE + '/reviews'
    const REPO_DIR = 'D:/DSH/sk-stock-review'
    const FS_POLICY = { mode: 'workspace-write', workspaceRoot: 'D:\\DSH' }
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
    const THS_FIELDS = '199112,10,9001,330323,133971,330324,9002,330329,133970,9003,330325,9004,330326,9005,330328,133969,9006,330327,9007,330330,9008,9009,9010,330331,9013,9014,9015,9016,9017,9018,330332,133972,330333,330336,9011,9012'
    const MARKET = [
      { key: 'sh', secid: '1.000001', tq: 'sh000001', ss: 'sh000001' },
      { key: 'sz', secid: '0.399106', tq: 'sz399106', ss: 'sz399106' }
    ]
    const san = (v) => (v === undefined ? null : v)

    const pad2 = (n) => (n < 10 ? '0' + n : '' + n)
    const shNow = () => new Date(Date.now() + 8 * 3600 * 1000)
    const shDate = () => shNow().toISOString().slice(0, 10)
    const shYmd = (ymd) => String(ymd).replace(/-/g, '')
    const md = (ymd) => { const p = String(ymd).split('-'); return (+p[1]) + '.' + (+p[2]) }
    const fmtWan = (n) => { n = Number(n) || 0; if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿'; if (n >= 1e4) return Math.round(n / 1e4) + '万'; return String(Math.round(n)) }
    const fmtTime = (ms) => { if (!ms) return ''; const d = new Date(ms + 8 * 3600 * 1000); return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) }
    const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
    const sleep = (ms) => new Promise((res) => ctx.timeout(res, ms))
    const snip = (s, n) => String(s).slice(0, n || 200)
    const limitPct = (code) => { const c = String(code); if (/^(30|68)/.test(c)) return 19.5; if (/^(8|4|92)/.test(c)) return 29.5; return 9.7 }
    const volLabelOf = (r) => { if (r == null) return null; if (r >= 1.15) return '放量晋级'; if (r <= 0.85) return '缩量晋级'; return '平量晋级' }
    const sinaSym = (code) => { const c = String(code); if (/^6/.test(c)) return 'sh' + c; if (/^[034]/.test(c)) return 'sz' + c; return 'bj' + c }

    async function curl(url, maxBytes, headers) {
      let lastErr = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const sp = ctx.get('subprocess')
          if (!sp) throw new Error('subprocess 服务不可用')
          const argv = ['curl.exe', '-s', '-L', '--max-time', '20', '-A', UA]
          if (headers) { for (const hd of headers) { argv.push('-H'); argv.push(hd) } }
          argv.push(url)
          const h = sp.spawn({ argv: argv, cwd: WORKSPACE, stdio: { stdin: 'ignore', stdout: { maxBytes: maxBytes || 1000000 }, stderr: { maxBytes: 20000 } }, graceMs: 25000 })
          const done = await h.done
          const so = h.collected && h.collected.stdout ? h.collected.stdout.readFrom(0).text : ''
          if (done.exitCode === 0 && so) return so
          lastErr = new Error('curl exit=' + done.exitCode + ' url=' + snip(url, 90))
        } catch (e) { lastErr = e }
        if (attempt === 0) await sleep(600)
      }
      throw lastErr || new Error('curl失败 ' + snip(url, 90))
    }
    async function fetchJson(url) {
      const text = await curl(url)
      const s = text.replace(/^\uFEFF/, '').trim()
      if (!s || s[0] !== '{') throw new Error('非JSON响应: ' + snip(s, 80))
      return JSON.parse(s)
    }
    async function curlEx(url, method, body, headers) {
      const sp = ctx.get('subprocess')
      if (!sp) throw new Error('subprocess 服务不可用')
      const argv = ['curl.exe', '-s', '-L', '--max-time', '30', '-X', method, '-A', UA]
      for (const hd of headers) { argv.push('-H'); argv.push(hd) }
      if (body != null) { argv.push('--data'); argv.push(body) }
      argv.push(url)
      const h = sp.spawn({ argv: argv, cwd: WORKSPACE, stdio: { stdin: 'ignore', stdout: { maxBytes: 3000000 }, stderr: { maxBytes: 30000 } }, graceMs: 40000 })
      const done = await h.done
      const so = h.collected && h.collected.stdout ? h.collected.stdout.readFrom(0).text : ''
      if (done.exitCode !== 0) throw new Error('curl exit=' + done.exitCode + ' url=' + snip(url, 60))
      const s = so.trim()
      if (!s) return null
      let j = null
      try { j = JSON.parse(s) } catch (e) { throw new Error('非JSON响应: ' + snip(s, 120)) }
      if (j && j.message && j.documentation_url) throw new Error('GitHub: ' + String(j.message).slice(0, 200))
      return j
    }
    async function readRepoFile(rel) {
      const fs = ctx.get('fs')
      if (!fs) throw new Error('fs 不可用')
      const t = await fs.resolve(REPO_DIR + '/' + rel)
      return await fs.readText(t)
    }
    async function writeBodyFile(content) {
      const fs = ctx.get('fs')
      if (!fs) throw new Error('fs 不可用')
      await ensureDirs()
      const t = await fs.resolve(BASE + '/.gh-body.json')
      await fs.writeText(t, content, undefined, undefined, FS_POLICY)
      return '@' + BASE + '/.gh-body.json'
    }
    const parseEmKlines = (j) => {
      const ks = (j && j.data && j.data.klines) || []
      const out = []
      for (const k of ks) {
        const p = String(k).split(',')
        out.push({ date: p[0], close: toNum(p[2]), volume: toNum(p[5]), amount: toNum(p[6]), pct: toNum(p[8]) })
      }
      return out
    }
    async function sinaKline(symbol, lmt) {
      const text = await curl('http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=' + symbol + '&scale=240&ma=no&datalen=' + (lmt || 16))
      const s = text.trim()
      if (!s || s[0] !== '[') throw new Error('Sina非JSON: ' + snip(s, 60))
      const arr = JSON.parse(s)
      const out = []
      let prev = null
      for (const it of arr) {
        const close = Number(it && it.close)
        if (!Number.isFinite(close)) continue
        const pct = prev != null ? Math.round(((close - prev) / prev) * 10000) / 100 : 0
        out.push({ date: String(it.day), close, volume: Math.round(toNum(it.volume) / 100), amount: null, pct })
        prev = close
      }
      return out
    }
    async function tencentKline(tq, lmt) {
      const j = await fetchJson('http://proxy.finance.qq.com/ifzqgtimg/appstock/app/fqkline/get?param=' + tq + ',day,,,' + (lmt || 12) + ',qfq')
      const d = j && j.data && j.data[tq]
      const day = (d && d.day) || []
      const out = []
      let prev = null
      for (const row of day) {
        if (!Array.isArray(row) || row.length < 6) continue
        const close = toNum(row[2])
        const pct = prev != null ? Math.round(((close - prev) / prev) * 10000) / 100 : 0
        out.push({ date: String(row[0]), close, volume: toNum(row[5]), amount: null, pct })
        prev = close
      }
      return out
    }
    async function sinaRealtime(symbols) {
      const text = await curl('http://hq.sinajs.cn/list=' + symbols, 30000, ['Referer: http://finance.sina.com.cn'])
      const out = {}
      const re = /hq_str_(\w+)="([^"]*)"/g
      let m
      while ((m = re.exec(text)) !== null) {
        const key = String(m[1]).indexOf('sz') === 0 ? 'sz' : 'sh'
        const f = String(m[2]).split(',')
        const v = toNum(f[8])
        out[key] = { date: String(f[30] || '').slice(0, 10), volume: v > 1e10 ? Math.round(v / 100) : v, amount: toNum(f[9]) }
      }
      if (!out.sh || !out.sz) throw new Error('sina实时解析失败')
      return out
    }
    async function emIndexKlineFor(cfg) {
      const base = 'http://push2his.eastmoney.com/api/qt/stock/kline/get?secid=' + cfg.secid + '&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59&klt=101&fqt=1&end=20500101&lmt=12'
      let rows = null
      try { rows = parseEmKlines(await fetchJson(base)) } catch (e) {}
      if (!rows || !rows.length) { try { rows = parseEmKlines(await fetchJson('https://' + base.slice(7))) } catch (e) {} }
      if (!rows || !rows.length) { try { rows = await tencentKline(cfg.tq, 12) } catch (e) {} }
      if (!rows || !rows.length) { try { rows = await sinaKline(cfg.ss, 12) } catch (e) {} }
      return rows || []
    }
    async function emIndexKlines() {
      const sh = await emIndexKlineFor(MARKET[0])
      const sz = await emIndexKlineFor(MARKET[1])
      let estimated = false
      try {
        const rt = await sinaRealtime('sh000001,sz399106')
        for (const cfg of MARKET) {
          const r = rt[cfg.key]
          const rows = cfg.key === 'sh' ? sh : sz
          if (!r || !rows.length || !r.amount || !r.volume) continue
          const last = rows[rows.length - 1]
          if (r.date !== last.date) continue
          const per = r.amount / r.volume
          let changed = false
          for (const row of rows) if (row.amount == null || row.amount <= 0) { row.amount = Math.round(row.volume * per); changed = true }
          if (changed) estimated = true
        }
      } catch (e) {}
      return { sh, sz, estimated }
    }
    async function emStockKline(code, lmt) {
      const c = String(code)
      const secid = (/^[69]/.test(c) ? '1.' : '0.') + c
      const q = 'secid=' + secid + '&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59&klt=101&fqt=1&end=20500101&lmt=' + (lmt || 16)
      try { return parseEmKlines(await fetchJson('http://push2his.eastmoney.com/api/qt/stock/kline/get?' + q)) } catch (e) {}
      try { return parseEmKlines(await fetchJson('https://push2his.eastmoney.com/api/qt/stock/kline/get?' + q)) } catch (e) {}
      try { return await sinaKline(sinaSym(c), lmt || 16) } catch (e) {}
      return []
    }
    function analyzeStreak(code, klines, reviewDate) {
      let idx = -1
      for (let i = 0; i < klines.length; i++) { if (klines[i].date === reviewDate) { idx = i; break } }
      if (idx < 0) return { streak: 0, volRatio: null }
      let streak = 0
      for (let i = idx; i >= 0; i--) {
        if (klines[i].pct >= limitPct(code)) streak++; else break
      }
      let volRatio = null
      if (idx > 0 && klines[idx - 1].volume > 0 && klines[idx].volume > 0) {
        volRatio = Math.round((klines[idx].volume / klines[idx - 1].volume) * 10) / 10
      }
      return { streak, volRatio }
    }

    const thsPoolUrl = (ymd, limit) => 'http://data.10jqka.com.cn/dataapi/limit_up/limit_up_pool?page=1&limit=' + (limit || 200) + '&field=' + THS_FIELDS + '&filter=HS,GEM2STAR&order_field=330324&order_type=0&date=' + shYmd(ymd)
    function parseBoards(hd) {
      const s = String(hd || '')
      const m = s.match(/(\d+)天(\d+)板/)
      if (m) return +m[2]
      return s.indexOf('首板') >= 0 ? 1 : 0
    }
    async function thsPool(ymd, limit) {
      let lastErr = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const j = await fetchJson(thsPoolUrl(ymd, limit))
          if (j && j.status_code === 0 && j.data) {
            const info = j.data.info || []
            return {
              date: ymd,
              total: (j.data.page && j.data.page.total) || info.length,
              items: info.map((it) => ({
                code: String(it.code || ''), name: String(it.name || ''), type: String(it.limit_up_type || ''),
                seal: toNum(it.order_amount), boards: parseBoards(it.high_days), highDays: String(it.high_days || ''),
                openNum: toNum(it.open_num),
                fbt: it.first_limit_up_time ? (+it.first_limit_up_time) * 1000 : null,
                lbt: it.last_limit_up_time ? (+it.last_limit_up_time) * 1000 : null,
                reason: String(it.reason_type || ''), change: toNum(it.change_rate)
              }))
            }
          }
          lastErr = new Error('同花顺接口错误 ' + ymd + ' status=' + (j && j.status_code))
        } catch (e) { lastErr = e }
        await sleep(400)
      }
      throw lastErr || new Error('同花顺接口错误 ' + ymd)
    }
    async function emDTPool() {
      const j = await fetchJson('http://push2ex.eastmoney.com/getTopicDTPool?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=300&sort=fund%3Aasc&date=' + shYmd(shDate()))
      const d = j && j.data
      const q = d ? String(d.qdate || '') : ''
      return {
        date: q.length === 8 ? q.slice(0, 4) + '-' + q.slice(4, 6) + '-' + q.slice(6) : '',
        total: d ? toNum(d.tc) : 0,
        items: (d && d.pool) ? d.pool.map((p) => ({ code: String(p.c || ''), name: String(p.n || '') })) : []
      }
    }
    async function emConcepts(n) {
      const j = await fetchJson('http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=60&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m%3A90%2Bt%3A3&fields=f2,f3,f12,f14')
      const diff = (j && j.data && j.data.diff) || []
      return diff.slice(0, n || 3).map((b) => ({ code: String(b.f12 || ''), name: String(b.f14 || ''), pct: toNum(b.f3) }))
    }
    async function emBoardStocks(bk) {
      const j = await fetchJson('http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=500&po=1&np=1&fltt=2&invt=2&fid=f3&fs=b%3A' + bk + '&fields=f12')
      const diff = (j && j.data && j.data.diff) || []
      const set = {}
      for (const b of diff) set[String(b.f12)] = true
      return set
    }
    async function emBoardTop(bk, n) {
      const j = await fetchJson('http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f6&fs=b%3A' + bk + '&fields=f12,f14,f3,f6')
      const diff = (j && j.data && j.data.diff) || []
      return diff.slice(0, n || 5).map((b) => ({ code: String(b.f12 || ''), name: String(b.f14 || ''), pct: toNum(b.f3), amount: toNum(b.f6) }))
    }

    async function resolveDates(klines) {
      const now = shNow()
      let cand = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      if (now.getUTCHours() < 16) cand = new Date(cand.getTime() - 86400e3)
      for (let i = 0; i < 10; i++) {
        const cymd = cand.toISOString().slice(0, 10)
        const hit = klines.filter((k) => k.date <= cymd)
        if (hit.length) {
          const review = hit[hit.length - 1].date
          return { review, prev: hit.length > 1 ? hit[hit.length - 2].date : null }
        }
        cand = new Date(cand.getTime() - 86400e3)
      }
      return null
    }
    async function latestReviewDateFallback() {
      const now = shNow()
      let d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      if (now.getUTCHours() < 16) d = new Date(d.getTime() - 86400e3)
      for (let i = 0; i < 8; i++) {
        const dow = d.getUTCDay()
        if (dow !== 0 && dow !== 6) {
          const ymd = d.toISOString().slice(0, 10)
          try {
            const pool = await thsPool(ymd, 1)
            if (pool.total > 0) return ymd
          } catch (e) {}
          await sleep(100)
        }
        d = new Date(d.getTime() - 86400e3)
      }
      return null
    }
    async function prevTradingDayFallback(ymd) {
      let d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)))
      for (let i = 0; i < 7; i++) {
        d = new Date(d.getTime() - 86400e3)
        const dow = d.getUTCDay()
        if (dow === 0 || dow === 6) continue
        const c = d.toISOString().slice(0, 10)
        try {
          const pool = await thsPool(c, 1)
          if (pool.total > 0) return c
        } catch (e) {}
        await sleep(100)
      }
      return null
    }

    let snap = { version: 1, dayStats: {}, auctionSeals: {}, lastReviewDate: null, lastRunAt: 0 }
    async function loadSnapshot() {
      try {
        const fs = ctx.get('fs')
        if (!fs) return
        const t = await fs.resolve(SNAP_FILE)
        const txt = await fs.readText(t)
        const j = JSON.parse(txt)
        if (j && j.dayStats) snap = j
        if (!snap.auctionSeals) snap.auctionSeals = {}
      } catch (e) {}
    }
    let dirOk = false
    async function ensureDirs() {
      if (dirOk) return
      const sp = ctx.get('subprocess')
      if (sp) {
        try {
          const h = sp.spawn({ argv: ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', 'New-Item -ItemType Directory -Force -Path \'D:\\DSH\\.stock-review\\reviews\' | Out-Null'], cwd: WORKSPACE, stdio: { stdin: 'ignore', stdout: { maxBytes: 1000 }, stderr: { maxBytes: 1000 } }, graceMs: 15000 })
          await h.done
        } catch (e) {}
      }
      dirOk = true
    }
    async function saveSnapshot() {
      const fs = ctx.get('fs')
      if (!fs) return false
      try {
        await ensureDirs()
        const t = await fs.resolve(SNAP_FILE)
        await fs.writeText(t, JSON.stringify(snap), undefined, undefined, FS_POLICY)
        return true
      } catch (e) { return false }
    }

    async function captureAuctionSeals() {
      try {
        const now = shNow()
        const dow = now.getUTCDay()
        if (dow === 0 || dow === 6) return
        const today = shDate()
        let pool = null
        for (let attempt = 0; attempt < 3 && !pool; attempt++) {
          try { pool = await thsPool(today, 200) } catch (e) {}
          if (!pool) await sleep(5000)
        }
        if (!pool || !pool.total || !pool.items.length) return
        const seals = {}
        for (const it of pool.items) if (it.type === '一字板') seals[it.code] = it.seal
        if (!Object.keys(seals).length) return
        snap.auctionSeals = snap.auctionSeals || {}
        snap.auctionSeals[today] = seals
        await saveSnapshot()
        console.log('[SK] 竞价封单已采集 ' + today + ' ' + Object.keys(seals).length + ' 只')
      } catch (e) { console.error('[SK] 竞价封单采集失败: ' + (e && e.message)) }
    }

    let cache = null
    async function buildReview(force) {
      const mkt = await emIndexKlines()
      const klines = mkt.sh
      if (!klines.length) throw new Error('无法获取上证指数K线')
      const amountEstimated = !!(mkt.estimated)
      const szRows = mkt.sz
      const szByDate = {}
      for (const r of szRows) szByDate[r.date] = r
      const marketAmountByDate = {}
      for (const r of klines) {
        let a = r.amount
        const sr = szByDate[r.date]
        if (sr && sr.amount) a = (a || 0) + sr.amount
        marketAmountByDate[r.date] = a
      }
      let dates = await resolveDates(klines)
      if (!dates || !dates.review) {
        const r = await latestReviewDateFallback()
        if (!r) throw new Error('近期无交易日数据')
        dates = { review: r, prev: null }
      }
      const reviewDate = dates.review
      if (!force && cache && cache.date === reviewDate && Date.now() - cache.builtAt < 30 * 60 * 1000) return cache.data
      const prevDate = dates.prev || (await prevTradingDayFallback(reviewDate))
      if (!prevDate) throw new Error('无前一交易日数据')

      const [today, prev, dt, concepts] = await Promise.all([
        thsPool(reviewDate), thsPool(prevDate), emDTPool(), emConcepts(3)
      ])

      const conceptStocks = {}
      const conceptTop = {}
      for (const c of concepts) {
        try { conceptStocks[c.code] = await emBoardStocks(c.code) } catch (e) { conceptStocks[c.code] = {} }
        try { conceptTop[c.code] = await emBoardTop(c.code, 5) } catch (e) { conceptTop[c.code] = [] }
      }

      const auction = snap.auctionSeals && snap.auctionSeals[reviewDate]
      const sealOf = (code, fb) => (auction && auction[code]) || fb

      const candSet = {}
      for (const it of today.items) {
        const hb = parseBoards(it.highDays)
        if (hb >= 2 || it.type === '一字板') candSet[it.code] = hb
      }
      const candCodes = Object.keys(candSet)
      const klineResults = await Promise.allSettled(candCodes.map(async (code) => {
        try { return { code, kl: await emStockKline(code, 16) } } catch (e) { return { code, kl: [] } }
      }))
      const klineMap = {}
      for (const r of klineResults) if (r.status === 'fulfilled') klineMap[r.value.code] = r.value.kl
      const analysisOf = {}
      for (const code of candCodes) {
        const hb = candSet[code]
        const a = analyzeStreak(code, klineMap[code] || [], reviewDate)
        analysisOf[code] = { streak: a.streak > 0 ? a.streak : hb, volRatio: a.volRatio, hb }
      }
      const boardsOf = {}
      for (const it of today.items) {
        const hb = parseBoards(it.highDays)
        boardsOf[it.code] = (analysisOf[it.code] ? analysisOf[it.code].streak : 0) || hb || 1
      }

      const prevByCode = {}
      for (const it of prev.items) prevByCode[it.code] = it
      const prevOneWord = {}
      for (const it of prev.items) if (it.type === '一字板') prevOneWord[it.code] = it

      const todayOneWord = today.items.filter((i) => i.type === '一字板')
      const oneRank = todayOneWord.slice().sort((a, b) => sealOf(b.code, b.seal) - sealOf(a.code, a.seal))
      const rankOf = {}
      oneRank.forEach((it, i) => { rankOf[it.code] = i + 1 })
      const rankText = (n) => (n >= 1 && n <= 3 ? '封单第' + ['一', '二', '三'][n - 1] : '')

      const cat = { up: [], added: [], first: [], down: [], flat: [], tShape: [] }
      const mkEntry = (it, pv) => {
        const seal = sealOf(it.code, it.seal)
        return {
          code: it.code, name: it.name, reason: it.reason, seal: seal, boards: boardsOf[it.code] || 1,
          prevSeal: pv ? pv.seal : 0, prevBoards: pv ? pv.boards : (boardsOf[it.code] || 1) - 1,
          rank: rankOf[it.code] || 0, rankText: rankText(rankOf[it.code] || 0),
          fbt: it.fbt, lbt: it.lbt, openNum: it.openNum, type: it.type,
          sealTag: auction && auction[it.code] ? '竞价' : '收盘'
        }
      }
      for (const it of todayOneWord) {
        const pv = prevByCode[it.code]
        const entry = mkEntry(it, pv)
        if (entry.boards <= 1) cat.first.push(entry)
        else if (pv && prevOneWord[it.code]) {
          const ratio = pv.seal > 0 ? it.seal / pv.seal : 1
          if (ratio > 1.005) cat.up.push(entry)
          else if (ratio < 0.995) cat.down.push(entry)
          else cat.flat.push(entry)
        } else cat.added.push(entry)
      }
      for (const it of today.items) {
        if (it.type !== 'T字板') continue
        cat.tShape.push(mkEntry(it, prevByCode[it.code]))
      }

      const markOf = (code) => concepts.filter((c) => conceptStocks[c.code] && conceptStocks[c.code][code]).map((c) => c.name)
      const ladderMap = {}
      const gapUp = []
      for (const it of today.items) {
        const b = boardsOf[it.code]
        const hb = parseBoards(it.highDays)
        const an = analysisOf[it.code]
        const pv = prevByCode[it.code]
        const seal = sealOf(it.code, it.seal)
        const node = {
          code: it.code, name: it.name, type: it.type, seal: seal, reason: it.reason,
          openNum: it.openNum, fbt: it.fbt, lbt: it.lbt, highDays: it.highDays,
          marks: markOf(it.code), prevSeal: pv ? pv.seal : 0, prevBoards: pv ? pv.boards : b - 1,
          rank: rankOf[it.code] || 0, rankText: rankText(rankOf[it.code] || 0),
          boards: b, streak: b, volRatio: an ? an.volRatio : null, volLabel: volLabelOf(an ? an.volRatio : null),
          sealTag: auction && auction[it.code] ? '竞价' : '收盘'
        }
        if (b >= 2) {
          if (!ladderMap[b]) ladderMap[b] = []
          ladderMap[b].push(node)
        } else if (hb >= 2) {
          gapUp.push(node)
        }
      }
      const boardNums = Object.keys(ladderMap).map(Number).sort((a, b) => b - a)
      const ladder = boardNums.map((bb) => ({ boards: bb, stocks: ladderMap[bb].sort((x, y) => y.seal - x.seal) }))

      const todayCodes = {}
      for (const it of today.items) todayCodes[it.code] = true
      const broken = prev.items.filter((i) => i.boards >= 2 && !todayCodes[i.code]).map((i) => ({ code: i.code, name: i.name, boards: i.boards }))

      const conceptsOut = concepts.map((c) => {
        const set = conceptStocks[c.code] || {}
        let zt = 0
        for (const it of today.items) if (set[it.code]) zt++
        let cnt = 0
        for (const k in set) cnt++
        return { code: c.code, name: c.name, pct: c.pct, ztCount: zt, memberCount: cnt, top5: conceptTop[c.code] || [] }
      })

      const kd = klines.filter((k) => k.date <= reviewDate).slice(-7)
      const stats = {}
      for (const k of kd) stats[k.date] = { zt: null, dt: null }
      for (const d of Object.keys(stats)) {
        const s = snap.dayStats && snap.dayStats[d]
        if (s) { stats[d].zt = s.zt; stats[d].dt = s.dt }
      }
      if (stats[reviewDate]) stats[reviewDate].zt = today.total
      if (prevDate && stats[prevDate]) stats[prevDate].zt = prev.total
      for (const d of Object.keys(stats)) {
        if (stats[d].zt == null) {
          try { stats[d].zt = (await thsPool(d, 1)).total } catch (e) {}
          await sleep(150)
        }
      }
      if (dt.date === reviewDate) stats[reviewDate].dt = dt.total
      const last7 = kd.map((k) => ({
        date: k.date, dateMD: md(k.date),
        close: san(k.close), pct: san(k.pct),
        amountYI: marketAmountByDate[k.date] == null ? null : Math.round((marketAmountByDate[k.date] / 1e8) * 10) / 10,
        zt: san(stats[k.date].zt), dt: san(stats[k.date].dt)
      }))
      const maxBoards = boardNums.length ? boardNums[0] : 0
      const theme = conceptsOut.slice(0, 3).map((c) => c.name.replace(/概念$|板块$|模块$/, '')).join('/') || '市场复盘'

      const data = {
        reviewDate, reviewDateMD: md(reviewDate), prevDate, prevDateMD: md(prevDate), theme,
        generatedAt: Date.now(),
        totals: { zt: today.total, oneWord: todayOneWord.length, maxBoards, dt: san(dt.date === reviewDate ? dt.total : null) },
        oneWord: cat, ladder, gapUp, broken, concepts: conceptsOut, last7,
        meta: {
          nextRunAtText: nextRunText(),
          nextCaptureText: nextCaptureText(),
          auctionCaptured: !!(auction && Object.keys(auction).length),
          source: '同花顺(涨停池/原因/封单) · 东方财富(概念板块/跌停) · 新浪/腾讯(备用K线)' + (amountEstimated ? ' · 大盘成交额为估算值' : '') + ' · 大盘成交额=沪深两市合计'
        }
      }
      cache = { date: reviewDate, builtAt: Date.now(), data }
      snap.lastReviewDate = reviewDate
      snap.lastRunAt = Date.now()
      for (const d of Object.keys(stats)) {
        if (stats[d].zt == null) continue
        snap.dayStats = snap.dayStats || {}
        snap.dayStats[d] = snap.dayStats[d] || {}
        snap.dayStats[d].zt = stats[d].zt
        if (stats[d].dt != null) snap.dayStats[d].dt = stats[d].dt
      }
      try { data.persistOk = await saveSnapshot() } catch (e) { data.persistOk = false }
      try { await saveMarkdown(data) } catch (e) {}
      return data
    }

    function analysisLines(it) {
      const lines = []
      lines.push((it.sealTag === '竞价' ? '竞价封单' : '封单') + fmtWan(it.seal) + (it.rankText ? '，' + it.rankText : ''))
      if (it.prevSeal > 0) {
        lines.push('昨日' + fmtWan(it.prevSeal) + '→今日' + fmtWan(it.seal) + (it.seal > it.prevSeal ? '，加单' : it.seal < it.prevSeal ? '，减单' : '，持平'))
      }
      if (it.volLabel) lines.push(it.volLabel + (it.volRatio ? '（量比' + it.volRatio + '）' : ''))
      if (it.type === '一字板') lines.push('一字板，' + (fmtTime(it.fbt) || '09:25') + '竞价封死')
      else if (it.type === 'T字板') lines.push('T字板' + (fmtTime(it.fbt) ? '，首封' + fmtTime(it.fbt) : ''))
      else lines.push('换手板' + (fmtTime(it.fbt) ? '，首封' + fmtTime(it.fbt) : ''))
      if (it.openNum > 0) lines.push('炸板' + it.openNum + '次')
      if (it.highDays) lines.push(it.highDays + (it.boards && it.highDays && parseBoards(it.highDays) !== it.boards ? '（现' + it.boards + '连板）' : ''))
      return lines.map((l, i) => (i + 1) + '. ' + l).join('<br/>')
    }
    function owRow(it, showPrev) {
      const label = it.prevBoards > 0 && it.boards > it.prevBoards ? it.prevBoards + '进' + it.boards + '：' : (it.boards > 1 ? it.boards + '板：' : '')
      const seal = fmtWan(it.seal)
      const change = showPrev && it.prevSeal > 0 ? fmtWan(it.prevSeal) + '到' + seal : seal
      return label + it.name + '（' + (it.reason || '—') + '），' + (it.sealTag === '竞价' ? '竞价封单' : '封单') + change + (it.rankText ? '，' + it.rankText : '')
    }
    function buildMarkdown(d) {
      const L = []
      L.push('## ' + d.reviewDateMD + ' ' + d.theme)
      L.push('')
      L.push('| ' + d.reviewDateMD + ' | | |')
      L.push('| --- | --- | --- |')
      const row = (label, arr, showPrev) => L.push('| ' + label + ' | ' + (arr.length ? arr.map((x) => owRow(x, showPrev)).join('<br/>') : ' ') + ' | |')
      row('连板加单一字', d.oneWord.up, true)
      row('首板一字', d.oneWord.first, false)
      row('新增一字', d.oneWord.added, false)
      row('T字<br/>（竞价封单强）', d.oneWord.tShape, false)
      row('一字封单减弱', d.oneWord.down, true)
      L.push('| 重点板块 | ' + (d.concepts.length ? d.concepts.map((c) => c.name + '(' + (c.pct > 0 ? '+' : '') + c.pct.toFixed(2) + '%，涨停' + c.ztCount + '家)').join('<br/>') : ' ') + ' | |')
      L.push('')
      L.push('| **连板数** | **个股+板块+预测** | **分析** |')
      L.push('| --- | --- | --- |')
      if (!d.ladder.length) {
        L.push('| - | 无连板股 | |')
      } else {
        for (const g of d.ladder) {
          const first = g.stocks[0]
          L.push('| ' + g.boards + ' | ' + first.name + '<br/>（' + (first.reason || '—') + '）' + (first.marks.length ? '<br/>📌' + first.marks.join('、') : '') + ' | ' + analysisLines(first) + ' |')
          for (const it of g.stocks.slice(1)) {
            L.push('|  | ' + it.name + '<br/>（' + (it.reason || '—') + '）' + (it.marks.length ? '<br/>📌' + it.marks.join('、') : '') + ' | ' + analysisLines(it) + ' |')
          }
        }
      }
      L.push('')
      if (d.gapUp.length) {
        L.push('**断板反包（几天几板）**')
        L.push('')
        L.push('| 个股+板块 | 几天几板 | 分析 |')
        L.push('| --- | --- | --- |')
        for (const it of d.gapUp) {
          L.push('| ' + it.name + '<br/>（' + (it.reason || '—') + '） | ' + (it.highDays || '—') + (it.boards > 1 ? '·现' + it.boards + '板' : '·今日反包') + ' | ' + analysisLines(it) + ' |')
        }
        L.push('')
      }
      if (d.broken.length) {
        L.push('**断板提示**：' + d.broken.map((b) => b.name + '(' + b.boards + '板)').join('、'))
        L.push('')
      }
      L.push('**近7日概览**')
      L.push('')
      L.push('| 日期 | 上证收盘 | 涨跌幅 | 大盘成交额(亿) | 涨停 | 跌停 |')
      L.push('| --- | --- | --- | --- | --- | --- |')
      for (const r of d.last7) {
        L.push('| ' + r.dateMD + ' | ' + (r.close == null ? '—' : r.close.toFixed(2)) + ' | ' + (r.pct == null ? '—' : (r.pct > 0 ? '+' : '') + r.pct.toFixed(2) + '%') + ' | ' + (r.amountYI == null ? '—' : r.amountYI) + ' | ' + (r.zt == null ? '—' : r.zt) + ' | ' + (r.dt == null ? '—' : r.dt) + ' |')
      }
      L.push('')
      L.push('> 自动生成于 ' + new Date().toLocaleString('zh-CN', { hour12: false }) + ' · 数据源：' + d.meta.source + ' · 一字板封单为早盘竞价封单(交易日9:30采集,未采集日显示收盘封单)')
      return L.join('\n')
    }
    async function saveMarkdown(d) {
      const fs = ctx.get('fs')
      if (!fs) return
      try {
        await ensureDirs()
        const path = REVIEW_DIR + '/' + d.reviewDateMD + '.md'
        const t = await fs.resolve(path)
        await fs.writeText(t, buildMarkdown(d), undefined, undefined, FS_POLICY)
      } catch (e) {}
    }

    function nextAtMs(now, hour, minute) {
      const sh = new Date(now + 8 * 3600 * 1000)
      const target = new Date(Date.UTC(sh.getUTCFullYear(), sh.getUTCMonth(), sh.getUTCDate(), hour, minute, 0) - 8 * 3600 * 1000)
      if (target.getTime() <= now) target.setTime(target.getTime() + 86400e3)
      return target.getTime() - now
    }
    function nextRunText() {
      const ms = nextAtMs(Date.now(), 7, 0)
      const sh = new Date(Date.now() + ms + 8 * 3600 * 1000)
      return (sh.getUTCMonth() + 1) + '.' + sh.getUTCDate() + ' 07:00'
    }
    function nextCaptureText() {
      const ms = nextAtMs(Date.now(), 9, 30)
      const sh = new Date(Date.now() + ms + 8 * 3600 * 1000)
      return (sh.getUTCMonth() + 1) + '.' + sh.getUTCDate() + ' 09:30'
    }
    let timerDisposer = null
    let timerDisposer2 = null
    function scheduleNext() {
      if (timerDisposer) timerDisposer()
      timerDisposer = ctx.timeout(async () => {
        try {
          await buildReview(true)
          console.log('[SK] 每日7点复盘已生成')
        } catch (e) { console.error('[SK] 定时任务失败: ' + (e && e.message)) }
        scheduleNext()
      }, nextAtMs(Date.now(), 7, 0))
    }
    function scheduleCapture() {
      if (timerDisposer2) timerDisposer2()
      timerDisposer2 = ctx.timeout(async () => {
        await captureAuctionSeals()
        scheduleCapture()
      }, nextAtMs(Date.now(), 9, 30))
    }

    harness.handle('review:get', async (args) => {
      try {
        const data = await buildReview(!!(args && args.force))
        return { ok: true, data, error: null }
      } catch (e) {
        return { ok: false, data: null, error: String((e && e.message) || e).slice(0, 300) }
      }
    })
    harness.handle('review:markdown', async () => {
      try {
        const data = await buildReview(false)
        const fs = ctx.get('fs')
        await ensureDirs()
        const path = REVIEW_DIR + '/' + data.reviewDateMD + '.md'
        const t = await fs.resolve(path)
        await fs.writeText(t, buildMarkdown(data), undefined, undefined, FS_POLICY)
        return { ok: true, path: path.replace(/\//g, '\\'), date: data.reviewDateMD, error: null }
      } catch (e) {
        return { ok: false, path: null, error: String((e && e.message) || e).slice(0, 300) }
      }
    })

    const ghTool = harness.defineTool({
      name: 'stkr_github_publish',
      description: 'SK插件一键部署到GitHub:使用Personal Access Token创建仓库并推送源码(无需git)。',
      parameters: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'GitHub Personal Access Token(需 repo 权限)' },
          repo: { type: 'string', description: '仓库名,默认 sk-stock-review' },
          private: { type: 'boolean', description: '私有仓库?默认 false' }
        },
        required: ['token']
      },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render(args, value) { return [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
      },
      async execute(args) {
        const token = String((args && args.token) || '').trim()
        const repo = String((args && args.repo) || 'sk-stock-review').trim()
        const priv = !!(args && args.private)
        if (!token) return { ok: false, error: '缺少 GitHub token' }
        const owner = 'YB-Jn'
        const api = 'https://api.github.com'
        const hdr = ['Authorization: Bearer ' + token, 'Accept: application/vnd.github+json', 'X-GitHub-Api-Version: 2022-11-28']
        try {
          let created = false
          try {
            await curlEx(api + '/user/repos', 'POST', JSON.stringify({ name: repo, description: 'SK 股市每日复盘插件 (DSH dynamic Cordis plugin)', private: priv, auto_init: false }), hdr)
            created = true
          } catch (e) { /* 仓库可能已存在 */ }
          const files = ['README.md', 'package.json', 'LICENSE', '.gitignore', 'src/host.js', 'src/client.js']
          const results = []
          for (const rel of files) {
            try {
              const content = await readRepoFile(rel)
              let sha = null
              try {
                const meta = await curlEx(api + '/repos/' + owner + '/' + repo + '/contents/' + rel, 'GET', null, hdr)
                if (meta && meta.sha) sha = meta.sha
              } catch (e) { /* 文件不存在 */ }
              const payload = { message: 'Add ' + rel, content: btoa(content) }
              if (sha) payload.sha = sha
              const bodyRef = await writeBodyFile(JSON.stringify(payload))
              await curlEx(api + '/repos/' + owner + '/' + repo + '/contents/' + rel, 'PUT', bodyRef, hdr)
              results.push(rel + ' ✓')
            } catch (e) { results.push(rel + ' ✗ ' + String((e && e.message) || e).slice(0, 140)) }
          }
          return { ok: true, url: 'https://github.com/' + owner + '/' + repo, created, files: results }
        } catch (e) {
          return { ok: false, error: String((e && e.message) || e).slice(0, 400) }
        }
      }
    })
    harness.registerTool(ctx, ghTool)

    const dbgTool = harness.defineTool({
      name: 'stkr_debug',
      description: '股票复盘插件诊断:构建最新复盘并返回摘要、错误与耗时。',
      parameters: {},
      output: {
        schema: { type: 'object', additionalProperties: true },
        render(args, value) { return [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
      },
      async execute() {
        try {
          const t0 = Date.now()
          const data = await buildReview(true)
          return {
            ok: true, ms: Date.now() - t0, reviewDate: data.reviewDate,
            totals: data.totals,
            oneWordCounts: { up: data.oneWord.up.length, added: data.oneWord.added.length, first: data.oneWord.first.length, down: data.oneWord.down.length, tShape: data.oneWord.tShape.length, flat: data.oneWord.flat.length },
            ladder: data.ladder.map((g) => g.boards + '板x' + g.stocks.length),
            gapUp: data.gapUp.map((s) => s.name + '(' + s.highDays + ')'),
            ladderSample: (data.ladder[0] && data.ladder[0].stocks[0]) ? { name: data.ladder[0].stocks[0].name, boards: data.ladder[0].stocks[0].boards, volLabel: data.ladder[0].stocks[0].volLabel, volRatio: data.ladder[0].stocks[0].volRatio, sealTag: data.ladder[0].stocks[0].sealTag } : null,
            concepts: data.concepts.map((c) => ({ name: c.name, pct: c.pct, top5: (c.top5 || []).length })),
            last7: data.last7, broken: data.broken.length,
            auctionCaptured: !!(data.meta && data.meta.auctionCaptured),
            amountEstimated: !!(data.meta && data.meta.source && data.meta.source.indexOf('估算') >= 0),
            persistOk: data.persistOk, persistPath: SNAP_FILE
          }
        } catch (e) {
          return { ok: false, error: String((e && e.message) || e) }
        }
      }
    })
    harness.registerTool(ctx, dbgTool)

    loadSnapshot().then(() => {
      scheduleNext()
      scheduleCapture()
      ctx.timeout(async () => {
        try { await buildReview(false) } catch (e) { console.error('[SK] 启动构建失败: ' + (e && e.message)) }
      }, 800)
    }).catch(() => {})
  }
}