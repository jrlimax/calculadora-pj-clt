(function () {
    'use strict';

    /* ══════════════════════════════════════════════════════
       Constantes — Tabelas 2026
       ══════════════════════════════════════════════════════ */

    const SALARIO_MINIMO = 1621.00;
    const TETO_INSS = 988.09;
    const INSS_PJ_ALIQUOTA = 0.11;
    const TETO_PREVIDENCIARIO = 8475.55;

    const FAIXAS_INSS = [
        { limite: 1621.00,  aliquota: 0.075 },
        { limite: 2902.84,  aliquota: 0.09  },
        { limite: 4354.27,  aliquota: 0.12  },
        { limite: 8475.55,  aliquota: 0.14  },
    ];

    const FAIXAS_IRRF = [
        { limite: 2428.80,   aliquota: 0,     deducao: 0      },
        { limite: 2826.65,   aliquota: 0.075, deducao: 182.16 },
        { limite: 3751.05,   aliquota: 0.15,  deducao: 394.16 },
        { limite: 4664.68,   aliquota: 0.225, deducao: 675.49 },
        { limite: Infinity,  aliquota: 0.275, deducao: 908.73 },
    ];

    const TABELA_SIMPLES = {
        I: [
            { limite: 180000, aliquota: 0.04, deducao: 0 },
            { limite: 360000, aliquota: 0.073, deducao: 5940 },
            { limite: 720000, aliquota: 0.095, deducao: 13860 },
            { limite: 1800000, aliquota: 0.107, deducao: 22500 },
            { limite: 3600000, aliquota: 0.143, deducao: 87300 },
            { limite: 4800000, aliquota: 0.19, deducao: 378000 },
        ],
        II: [
            { limite: 180000, aliquota: 0.045, deducao: 0 },
            { limite: 360000, aliquota: 0.078, deducao: 5940 },
            { limite: 720000, aliquota: 0.1, deducao: 13860 },
            { limite: 1800000, aliquota: 0.112, deducao: 22500 },
            { limite: 3600000, aliquota: 0.147, deducao: 85500 },
            { limite: 4800000, aliquota: 0.3, deducao: 720000 },
        ],
        III: [
            { limite: 180000, aliquota: 0.06, deducao: 0 },
            { limite: 360000, aliquota: 0.112, deducao: 9360 },
            { limite: 720000, aliquota: 0.135, deducao: 17640 },
            { limite: 1800000, aliquota: 0.16, deducao: 35640 },
            { limite: 3600000, aliquota: 0.21, deducao: 125640 },
            { limite: 4800000, aliquota: 0.33, deducao: 648000 },
        ],
        IV: [
            { limite: 180000, aliquota: 0.045, deducao: 0 },
            { limite: 360000, aliquota: 0.09, deducao: 8100 },
            { limite: 720000, aliquota: 0.102, deducao: 12420 },
            { limite: 1800000, aliquota: 0.14, deducao: 39780 },
            { limite: 3600000, aliquota: 0.22, deducao: 183780 },
            { limite: 4800000, aliquota: 0.33, deducao: 828000 },
        ],
        V: [
            { limite: 180000, aliquota: 0.155, deducao: 0 },
            { limite: 360000, aliquota: 0.18, deducao: 4500 },
            { limite: 720000, aliquota: 0.195, deducao: 9900 },
            { limite: 1800000, aliquota: 0.205, deducao: 17100 },
            { limite: 3600000, aliquota: 0.23, deducao: 62100 },
            { limite: 4800000, aliquota: 0.305, deducao: 540000 },
        ],
    };

    /* ══════════════════════════════════════════════════════
       Funções de cálculo
       ══════════════════════════════════════════════════════ */

    /** INSS progressivo — faixa a faixa */
    function calcINSS(salario) {
        if (salario <= 0) return 0;
        let inss = 0;
        let anterior = 0;
        for (const faixa of FAIXAS_INSS) {
            if (salario <= anterior) break;
            const faixaBase = Math.min(salario, faixa.limite) - anterior;
            inss += faixaBase * faixa.aliquota;
            anterior = faixa.limite;
        }
        return Math.min(inss, TETO_INSS);
    }

    /** IRRF com desconto progressivo (Lei 15.270/2025) */
    function calcIRRF(salarioBruto, inss) {
        const base = salarioBruto - inss;
        if (base <= 0) return { irrf: 0, badge: 'isento (lei 2026)', badgeClass: 'badge--isento', bruto: 0, desconto: 0, base: 0 };

        // Etapa 1 — imposto bruto pela tabela progressiva
        let bruto = 0;
        for (const faixa of FAIXAS_IRRF) {
            if (base <= faixa.limite) {
                bruto = Math.max(0, base * faixa.aliquota - faixa.deducao);
                break;
            }
        }

        // Etapa 2 — desconto progressivo
        let desconto = 0;
        let badge = '';
        let badgeClass = '';

        if (base <= 5000) {
            desconto = bruto;
            badge = 'isento (lei 2026)';
            badgeClass = 'badge--isento';
        } else if (base <= 7350) {
            desconto = bruto * (7350 - base) / (7350 - 5000);
            badge = 'desconto parcial';
            badgeClass = 'badge--parcial';
        } else {
            desconto = 0;
            badge = 'tabela integral';
            badgeClass = 'badge--integral';
        }

        const irrf = Math.max(0, bruto - desconto);
        return { irrf, badge, badgeClass, bruto, desconto, base };
    }

    /** INSS do sócio sobre pró-labore (11% com teto previdenciário) */
    function calcINSSProLabore(proLabore) {
        const base = Math.max(0, proLabore);
        return Math.min(base * INSS_PJ_ALIQUOTA, TETO_PREVIDENCIARIO * INSS_PJ_ALIQUOTA);
    }

    /** Encargos patronais opcionais da empresa sobre o pró-labore */
    function calcEncargosPatronais(proLabore, aliquotaBase, aliquotaAdicional) {
        const totalAliquota = Math.max(0, (aliquotaBase || 0) + (aliquotaAdicional || 0));
        return Math.max(0, proLabore) * totalAliquota;
    }

    function calcAliquotaEfetivaSimples(anexo, rbt12) {
        const tabela = TABELA_SIMPLES[anexo] || TABELA_SIMPLES.III;
        const receita12 = Math.max(0, rbt12);
        const referencia = receita12 > 0 ? receita12 : 180000;
        const faixa = tabela.find(function (f) { return referencia <= f.limite; }) || tabela[tabela.length - 1];
        const aliquotaEfetiva = Math.max(0, ((referencia * faixa.aliquota) - faixa.deducao) / referencia);
        return { faixa, aliquotaEfetiva };
    }

    function calcTributosSimples(faturamento, anexo, rbt12) {
        const simples = calcAliquotaEfetivaSimples(anexo, rbt12);
        return {
            tipo: 'simples',
            anexo: anexo,
            aliquotaEfetiva: simples.aliquotaEfetiva,
            total: Math.max(0, faturamento) * simples.aliquotaEfetiva,
        };
    }

    function calcTributosPresumido(faturamento, issAliquota) {
        const receita = Math.max(0, faturamento);
        const basePresumida = receita * 0.32;
        const irpj = basePresumida * 0.15;
        const irpjAdicional = Math.max(0, basePresumida - 20000) * 0.10;
        const csll = basePresumida * 0.09;
        const pis = receita * 0.0065;
        const cofins = receita * 0.03;
        const iss = receita * Math.max(0, issAliquota || 0);
        const total = irpj + irpjAdicional + csll + pis + cofins + iss;

        return {
            tipo: 'presumido',
            aliquotaEfetiva: receita > 0 ? total / receita : 0,
            irpj: irpj,
            irpjAdicional: irpjAdicional,
            csll: csll,
            pis: pis,
            cofins: cofins,
            iss: iss,
            total: total,
        };
    }

    function calcImpostoLucrosDistribuidos(lucrosDistribuidos, aliquotaLucros) {
        const lucros = Math.max(0, lucrosDistribuidos);
        const aliquota = Math.max(0, aliquotaLucros || 0);
        const baseTributavel = Math.max(0, lucros - 50000);
        return baseTributavel * aliquota;
    }

    function calcPjMensal(faturamento, inp) {
        const faturamentoMensal = Math.max(0, faturamento);
        const rbt12 = inp.rbt12 > 0 ? inp.rbt12 : (faturamentoMensal * 12);
        const proLaboreCalculado = Math.max(inp.proLabore, SALARIO_MINIMO);
        const inssSocio = calcINSSProLabore(proLaboreCalculado);
        const irrfSocio = calcIRRF(proLaboreCalculado, inssSocio);
        const patronal = calcEncargosPatronais(proLaboreCalculado, inp.encargoPatronal, inp.adicionaisPatronais);
        const tributos = inp.regime === 'simples'
            ? calcTributosSimples(faturamentoMensal, inp.anexoSimples, rbt12)
            : calcTributosPresumido(faturamentoMensal, inp.issAliquota);
        const impostoLucros = calcImpostoLucrosDistribuidos(inp.lucrosDistribuidos, inp.aliquotaLucros);
        const liquidoMensal = faturamentoMensal - tributos.total - inp.contador - inssSocio - irrfSocio.irrf - patronal + inp.lucrosDistribuidos - impostoLucros;

        return {
            rbt12: rbt12,
            proLabore: proLaboreCalculado,
            tributos: tributos,
            inssSocio: inssSocio,
            irrfSocio: irrfSocio,
            patronal: patronal,
            impostoLucros: impostoLucros,
            liquidoMensal: liquidoMensal,
            totalAnual: liquidoMensal * 12,
        };
    }

    /** Formata valor como moeda BRL */
    function fmt(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    /** Lê todos os inputs do formulário */
    function getInputs() {
        return {
            salarioBruto:     parseFloat(document.getElementById('salarioBruto').value) || 0,
            faturamento:      parseFloat(document.getElementById('faturamento').value) || 0,
            regime:           document.getElementById('regime').value,
            anexoSimples:     document.getElementById('anexoSimples').value,
            rbt12:            parseFloat(document.getElementById('rbt12').value) || 0,
            proLabore:        parseFloat(document.getElementById('proLabore').value) || 0,
            encargoPatronal:  parseFloat(document.getElementById('encargoPatronal').value) || 0,
            adicionaisPatronais: (parseFloat(document.getElementById('adicionaisPatronais').value) || 0) / 100,
            issAliquota:      (parseFloat(document.getElementById('issAliquota').value) || 0) / 100,
            lucrosDistribuidos: parseFloat(document.getElementById('lucrosDistribuidos').value) || 0,
            aliquotaLucros:   (parseFloat(document.getElementById('aliquotaLucros').value) || 0) / 100,
            contador:         parseFloat(document.getElementById('contador').value) || 0,
            vr:               parseFloat(document.getElementById('vr').value) || 0,
            vtDetalhado:      document.getElementById('vtToggle').getAttribute('aria-checked') === 'true',
            vtMensal:         parseFloat(document.getElementById('vtMensal').value) || 0,
            vtPassagem:       parseFloat(document.getElementById('vtPassagem').value) || 0,
            vtDias:           parseFloat(document.getElementById('vtDias').value) || 0,
            planoSaude:       parseFloat(document.getElementById('planoSaude').value) || 0,
            outrosBeneficios: parseFloat(document.getElementById('outrosBeneficios').value) || 0,
        };
    }

    /* ══════════════════════════════════════════════════════
       Breakeven — ponto de equilíbrio
       ══════════════════════════════════════════════════════ */

    /** Calcula VT: passagem × 2 (ida+volta) × dias úteis */
    function calcVtTotal(passagem, dias) {
        return passagem * 2 * dias;
    }

    /** Desconto VT: mínimo entre custo real e 6% do salário base */
    function calcVtDesconto(vtTotal, salario) {
        if (vtTotal <= 0) return 0;
        return Math.min(vtTotal, salario * 0.06);
    }

    /** Mês equivalente CLT para um dado salário bruto + benefícios */
    function calcCltMesEquivalente(salario, vr, vtTotal, planoSaude, outrosBeneficios) {
        const inss = calcINSS(salario);
        const irrf = calcIRRF(salario, inss);
        const vtDesc = calcVtDesconto(vtTotal, salario);
        const vtLiq = vtTotal - vtDesc;
        const liqMensal = salario - inss - irrf.irrf + vr + vtLiq + planoSaude + outrosBeneficios;

        const d13inss = calcINSS(salario);
        const d13irrf = calcIRRF(salario, d13inss);
        const d13liq  = salario - d13inss - d13irrf.irrf;

        const fBase  = salario * (4 / 3);
        const fInss  = calcINSS(fBase);
        const fIrrf  = calcIRRF(fBase, fInss);
        const fLiq   = fBase - fInss - fIrrf.irrf;

        const fgts = salario * 0.08 * 12;
        return ((liqMensal * 12) + d13liq + fLiq + fgts) / 12;
    }

    /** Faturamento PJ mínimo para empatar com CLT */
    function calcBreakevenPJ(cltMesEquivalente, inp) {
        let lo = 0;
        let hi = 500000;
        for (let i = 0; i < 100; i++) {
            const mid = (lo + hi) / 2;
            const pjMid = calcPjMensal(mid, inp);
            if (pjMid.liquidoMensal < cltMesEquivalente) lo = mid;
            else hi = mid;
        }
        return Math.ceil((lo + hi) / 2 * 100) / 100;
    }

    /** Salário CLT mínimo para empatar com PJ (busca binária) */
    function calcBreakevenCLT(pjLiquidoMensal, vr, vtTotal, planoSaude, outrosBeneficios) {
        let lo = 0;
        let hi = 200000;
        for (let i = 0; i < 100; i++) {
            const mid = (lo + hi) / 2;
            const mesEq = calcCltMesEquivalente(mid, vr, vtTotal, planoSaude, outrosBeneficios);
            if (mesEq < pjLiquidoMensal) lo = mid;
            else hi = mid;
        }
        return Math.ceil((lo + hi) / 2 * 100) / 100;
    }

    /* ══════════════════════════════════════════════════════
       Cálculo principal
       ══════════════════════════════════════════════════════ */

    function calcular() {
        const inp = getInputs();

        if (inp.salarioBruto <= 0 && inp.faturamento <= 0) {
            alert('Informe ao menos o salário CLT ou o faturamento PJ.');
            return;
        }

        // ── CLT Mensal ──────────────────────────────────────
        const cltINSS = calcINSS(inp.salarioBruto);
        const cltIRRF = calcIRRF(inp.salarioBruto, cltINSS);
        const vtTotal    = inp.vtDetalhado
                         ? calcVtTotal(inp.vtPassagem, inp.vtDias)
                         : inp.vtMensal;
        const vtDesconto = calcVtDesconto(vtTotal, inp.salarioBruto);
        const vtLiquido  = vtTotal - vtDesconto;
        const cltLiquidoMensal = inp.salarioBruto - cltINSS - cltIRRF.irrf
                                 + inp.vr + vtLiquido + inp.planoSaude + inp.outrosBeneficios;

        // ── CLT 13º salário líquido ─────────────────────────
        const dec13INSS  = calcINSS(inp.salarioBruto);
        const dec13IRRF  = calcIRRF(inp.salarioBruto, dec13INSS);
        const dec13Liq   = inp.salarioBruto - dec13INSS - dec13IRRF.irrf;

        // ── CLT Férias + 1/3 líquidas ───────────────────────
        const feriasBase  = inp.salarioBruto * (4 / 3);
        const feriasINSS  = calcINSS(feriasBase);
        const feriasIRRF  = calcIRRF(feriasBase, feriasINSS);
        const feriasLiq   = feriasBase - feriasINSS - feriasIRRF.irrf;

        // ── CLT FGTS anual ──────────────────────────────────
        const fgtsAnual = inp.salarioBruto * 0.08 * 12;

        // ── CLT Total anual & mês equivalente ───────────────
        const cltTotalAnual     = (cltLiquidoMensal * 12) + dec13Liq + feriasLiq + fgtsAnual;
        const cltMesEquivalente = cltTotalAnual / 12;

        // ── PJ Mensal ───────────────────────────────────────
        const pjCalc = calcPjMensal(inp.faturamento, inp);
        const pjLiquidoMensal = pjCalc.liquidoMensal;
        const pjTotalAnual = pjCalc.totalAnual;

        // ── Veredicto ───────────────────────────────────────
        const diffMensal = pjLiquidoMensal - cltMesEquivalente;
        const diffAnual  = diffMensal * 12;
        const pjVence    = diffMensal > 0;

        renderResults({
            inp,
            clt: {
                inss: cltINSS,
                irrf: cltIRRF,
                liquidoMensal: cltLiquidoMensal,
                vtTotal,
                vtDesconto,
                vtLiquido,
                dec13:  { inss: dec13INSS, irrf: dec13IRRF, liquido: dec13Liq },
                ferias: { base: feriasBase, inss: feriasINSS, irrf: feriasIRRF, liquido: feriasLiq },
                fgtsAnual,
                totalAnual: cltTotalAnual,
                mesEquivalente: cltMesEquivalente,
            },
            pj: {
                rbt12: pjCalc.rbt12,
                tributos: pjCalc.tributos,
                proLabore: pjCalc.proLabore,
                inssSocio: pjCalc.inssSocio,
                irrfSocio: pjCalc.irrfSocio,
                patronal: pjCalc.patronal,
                impostoLucros: pjCalc.impostoLucros,
                liquidoMensal: pjLiquidoMensal,
                totalAnual: pjTotalAnual,
            },
            veredicto: {
                pjVence,
                diffMensal: Math.abs(diffMensal),
                diffAnual: Math.abs(diffAnual),
                breakevenPJ: calcBreakevenPJ(cltMesEquivalente, inp),
                breakevenCLT: calcBreakevenCLT(pjLiquidoMensal, inp.vr, vtTotal, inp.planoSaude, inp.outrosBeneficios),
            },
        });
    }

    /* ══════════════════════════════════════════════════════
       Renderização dos resultados
       ══════════════════════════════════════════════════════ */

    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function lineItem(label, value, opts) {
        opts = opts || {};
        const classes = ['line-item'];
        if (opts.isTotal) classes.push('line-item--total', opts.totalClass || '');

        let valClass = '';
        if (opts.negative) valClass = 'negative';
        else if (opts.positive) valClass = 'positive';

        const prefix = opts.negative ? '− ' : (opts.positive ? '+ ' : '');
        const badgeHtml = opts.badge
            ? '<span class="badge ' + esc(opts.badgeClass) + '">' + esc(opts.badge) + '</span>'
            : '';

        return '<div class="' + classes.join(' ') + '">'
             +   '<span class="label">' + esc(label) + badgeHtml + '</span>'
             +   '<span class="value ' + valClass + '">' + prefix + fmt(Math.abs(value)) + '</span>'
             + '</div>';
    }

    function renderResults(data) {
        const { inp, clt, pj, veredicto } = data;
        const regimeLabel = inp.regime === 'simples'
            ? ('Simples — Anexo ' + inp.anexoSimples)
            : 'Lucro Presumido';

        let html = '<div class="results-grid">';

        // ── CLT Mensal ──────────────────────────────────
        html += '<div class="result-card">'
             +    '<div class="card-title card-title--clt">CLT — Mensal</div>'
             +    lineItem('Salário bruto', inp.salarioBruto)
             +    lineItem('INSS', clt.inss, { negative: true })
             +    lineItem('Base IRRF', clt.irrf.base)
             +    lineItem('IRRF', clt.irrf.irrf, { negative: true, badge: clt.irrf.badge, badgeClass: clt.irrf.badgeClass });

        if (inp.vr)               html += lineItem('VR / VA', inp.vr, { positive: true });
        if (clt.vtTotal > 0) {
            var vtLabel = inp.vtDetalhado
                ? 'VT (' + fmt(inp.vtPassagem) + ' × 2 × ' + inp.vtDias + 'd)'
                : 'Vale-Transporte';
            html += lineItem(vtLabel, clt.vtTotal, { positive: true });
            html += lineItem('Desconto VT (6%)', clt.vtDesconto, { negative: true });
        }
        if (inp.planoSaude)       html += lineItem('Plano de saúde', inp.planoSaude, { positive: true });
        if (inp.outrosBeneficios) html += lineItem('Outros benefícios', inp.outrosBeneficios, { positive: true });

        html += lineItem('Líquido mensal', clt.liquidoMensal, { isTotal: true, totalClass: 'clt' })
             + '</div>';

        // ── PJ Mensal ───────────────────────────────────
        html += '<div class="result-card">'
             +    '<div class="card-title card-title--pj">PJ — Mensal</div>'
               +    '<div class="line-item"><span class="label">Regime</span><span class="value">' + esc(regimeLabel) + '</span></div>'
             +    lineItem('Faturamento bruto', inp.faturamento)
               +    lineItem('Tributos do regime (efetiva ' + (pj.tributos.aliquotaEfetiva * 100).toFixed(2).replace('.', ',') + '%)', pj.tributos.total, { negative: true })
               +    lineItem('Pró-labore', pj.proLabore)
               +    lineItem('INSS sócio (11%)', pj.inssSocio, { negative: true })
               +    lineItem('IRRF pró-labore', pj.irrfSocio.irrf, { negative: true, badge: pj.irrfSocio.badge, badgeClass: pj.irrfSocio.badgeClass })
               +    lineItem('Encargos patronais', pj.patronal, { negative: true })
               +    lineItem('Imposto sobre lucros distribuídos', pj.impostoLucros, { negative: true })
             +    lineItem('Contador', inp.contador, { negative: true })
             +    lineItem('Líquido mensal', pj.liquidoMensal, { isTotal: true, totalClass: 'pj' })
             + '</div>';

           if (inp.regime === 'presumido') {
              html += '<div class="result-card">'
                  +    '<div class="card-title card-title--pj">PJ — Detalhe Lucro Presumido</div>'
                  +    lineItem('IRPJ (15%)', pj.tributos.irpj, { negative: true })
                  +    lineItem('Adicional IRPJ (10%)', pj.tributos.irpjAdicional, { negative: true })
                  +    lineItem('CSLL', pj.tributos.csll, { negative: true })
                  +    lineItem('PIS', pj.tributos.pis, { negative: true })
                  +    lineItem('COFINS', pj.tributos.cofins, { negative: true })
                  +    lineItem('ISS', pj.tributos.iss, { negative: true })
                  + '</div>';
           }

        // ── CLT Anual ───────────────────────────────────
        html += '<div class="result-card result-card--annual">'
             +    '<div class="card-title card-title--clt">CLT — Benefícios Anuais</div>'
             +    '<div class="annual-items">'
             +      '<div class="annual-item">'
             +        '<div class="item-label">13º salário líquido</div>'
             +        '<div class="item-value">' + fmt(clt.dec13.liquido) + '</div>'
             +      '</div>'
             +      '<div class="annual-item">'
             +        '<div class="item-label">Férias + 1/3 líquidas</div>'
             +        '<div class="item-value">' + fmt(clt.ferias.liquido) + '</div>'
             +      '</div>'
             +      '<div class="annual-item">'
             +        '<div class="item-label">FGTS anual (8% × 12)</div>'
             +        '<div class="item-value">' + fmt(clt.fgtsAnual) + '</div>'
             +      '</div>'
             +    '</div>'
             +    '<div class="annual-totals">'
             +      '<div class="annual-total">'
             +        '<div class="item-label">Total anual CLT</div>'
             +        '<div class="item-value">' + fmt(clt.totalAnual) + '</div>'
             +      '</div>'
             +      '<div class="annual-total">'
             +        '<div class="item-label">Mês equivalente CLT</div>'
             +        '<div class="item-value">' + fmt(clt.mesEquivalente) + '</div>'
             +      '</div>'
             +    '</div>'
             + '</div>';

        html += '</div>'; // fecha results-grid

        // ── Veredicto ───────────────────────────────────
        const vClass = veredicto.pjVence ? 'verdict--pj' : 'verdict--clt';
        const vText  = veredicto.pjVence
            ? 'PJ vale mais no seu bolso'
            : 'CLT vale mais no seu bolso';

        html += '<div class="verdict ' + vClass + '">'
             +    '<h3>' + esc(vText) + '</h3>'
             +    '<div class="verdict-comparison">'
             +      '<div class="verdict-col">'
             +        '<span class="verdict-label">Líquido PJ / mês</span>'
             +        '<span class="verdict-value verdict-value--pj">' + fmt(pj.liquidoMensal) + '</span>'
             +      '</div>'
             +      '<div class="verdict-vs">vs</div>'
             +      '<div class="verdict-col">'
             +        '<span class="verdict-label">Mês equivalente CLT</span>'
             +        '<span class="verdict-value verdict-value--clt">' + fmt(clt.mesEquivalente) + '</span>'
             +      '</div>'
             +    '</div>'
             +    '<div class="diff">'
             +      '<div class="diff-item">Diferença mensal: <strong>' + fmt(veredicto.diffMensal) + '</strong></div>'
             +      '<div class="diff-item">Diferença anual: <strong>' + fmt(veredicto.diffAnual) + '</strong></div>'
             +    '</div>'
             +    '<div class="breakeven">' 
             +      '<div class="breakeven-item">' 
             +        '<span class="breakeven-label">Para empatar sendo <strong class="' + (veredicto.pjVence ? 'text-clt' : 'text-pj') + '">' + (veredicto.pjVence ? 'CLT' : 'PJ') + '</strong>, ' + (veredicto.pjVence ? 'ganhe no mínimo' : 'fature no mínimo') + '</span>' 
             +        '<span class="breakeven-value ' + (veredicto.pjVence ? 'text-clt' : 'text-pj') + '">' + fmt(veredicto.pjVence ? veredicto.breakevenCLT : veredicto.breakevenPJ) + '<small>' + (veredicto.pjVence ? '/mês bruto' : '/mês') + '</small></span>'
             +      '</div>'
             +    '</div>'
             + '</div>';

        // Injeta no DOM
        var section = document.getElementById('results');
        section.innerHTML = html;
        section.classList.add('visible');

        document.getElementById('disclaimer').classList.add('visible');
        document.getElementById('btnExportar').classList.remove('hidden');

        // Guarda dados para exportação
        window.__lastCalc = data;

        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ══════════════════════════════════════════════════════
       Event listeners
       ══════════════════════════════════════════════════════ */

    document.getElementById('btnCalcular').addEventListener('click', calcular);
    document.getElementById('btnExportar').addEventListener('click', exportarPlanilha);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') calcular();
    });

    // ── Toggle VT simples / detalhado ────────────────────
    var vtToggle = document.getElementById('vtToggle');
    var vtSimples = document.getElementById('vtSimples');
    var vtDetalhado = document.getElementById('vtDetalhado');

    function toggleVt() {
        var isOn = vtToggle.getAttribute('aria-checked') === 'true';
        vtToggle.setAttribute('aria-checked', String(!isOn));
        vtToggle.classList.toggle('active', !isOn);
        vtSimples.classList.toggle('hidden', !isOn);
        vtDetalhado.classList.toggle('hidden', isOn);
    }

    vtToggle.addEventListener('click', toggleVt);
    vtToggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleVt(); }
    });

    /* ══════════════════════════════════════════════════════
       Exportar planilha (CSV)
       ══════════════════════════════════════════════════════ */

    function num(v) { return v.toFixed(2).replace('.', ','); }

    function exportarPlanilha() {
        var d = window.__lastCalc;
        if (!d) return;

        var sep = ';';
        var rows = [];

        function add(a, b) { rows.push(a + sep + b); }
        function blank() { rows.push(''); }

        add('COMPARATIVO PJ vs CLT', 'Data: ' + new Date().toLocaleDateString('pt-BR'));
        blank();

        // CLT Mensal
        add('CLT — MENSAL', '');
        add('Salário bruto', num(d.inp.salarioBruto));
        add('INSS', '-' + num(d.clt.inss));
        add('Base IRRF', num(d.clt.irrf.base));
        add('IRRF (' + d.clt.irrf.badge + ')', '-' + num(d.clt.irrf.irrf));
        if (d.inp.vr) add('VR / VA', num(d.inp.vr));
        if (d.clt.vtTotal > 0) {
            add('Vale-Transporte', num(d.clt.vtTotal));
            add('Desconto VT (6%)', '-' + num(d.clt.vtDesconto));
        }
        if (d.inp.planoSaude) add('Plano de saúde', num(d.inp.planoSaude));
        if (d.inp.outrosBeneficios) add('Outros benefícios', num(d.inp.outrosBeneficios));
        add('Líquido mensal CLT', num(d.clt.liquidoMensal));
        blank();

        // CLT Anual
        add('CLT — BENEFÍCIOS ANUAIS', '');
        add('13º salário líquido', num(d.clt.dec13.liquido));
        add('Férias + 1/3 líquidas', num(d.clt.ferias.liquido));
        add('FGTS anual', num(d.clt.fgtsAnual));
        add('Total anual CLT', num(d.clt.totalAnual));
        add('Mês equivalente CLT', num(d.clt.mesEquivalente));
        blank();

        // PJ Mensal
        var regimeLabel = d.inp.regime === 'simples' ? ('Simples - Anexo ' + d.inp.anexoSimples) : 'Lucro Presumido';
        add('PJ — MENSAL', '');
        add('Regime', regimeLabel);
        add('RBT12 usado', num(d.pj.rbt12));
        add('Faturamento bruto', num(d.inp.faturamento));
        add('Tributos do regime', '-' + num(d.pj.tributos.total));
        add('Aliquota efetiva do regime (%)', num(d.pj.tributos.aliquotaEfetiva * 100));
        add('Pró-labore', num(d.pj.proLabore));
        add('INSS sócio (11%)', '-' + num(d.pj.inssSocio));
        add('IRRF pró-labore (' + d.pj.irrfSocio.badge + ')', '-' + num(d.pj.irrfSocio.irrf));
        add('Encargos patronais', '-' + num(d.pj.patronal));
        add('Lucros distribuídos', num(d.inp.lucrosDistribuidos));
        add('Imposto sobre lucros distribuídos', '-' + num(d.pj.impostoLucros));
        add('Contador', '-' + num(d.inp.contador));
        add('Líquido mensal PJ', num(d.pj.liquidoMensal));
        if (d.inp.regime === 'presumido') {
            add('IRPJ', '-' + num(d.pj.tributos.irpj));
            add('Adicional IRPJ', '-' + num(d.pj.tributos.irpjAdicional));
            add('CSLL', '-' + num(d.pj.tributos.csll));
            add('PIS', '-' + num(d.pj.tributos.pis));
            add('COFINS', '-' + num(d.pj.tributos.cofins));
            add('ISS', '-' + num(d.pj.tributos.iss));
        }
        blank();

        // Veredicto
        add('VEREDICTO', d.veredicto.pjVence ? 'PJ vale mais' : 'CLT vale mais');
        add('Líquido PJ / mês', num(d.pj.liquidoMensal));
        add('Mês equivalente CLT', num(d.clt.mesEquivalente));
        add('Diferença mensal', num(d.veredicto.diffMensal));
        add('Diferença anual', num(d.veredicto.diffAnual));
        if (d.veredicto.pjVence) {
            add('CLT mínimo p/ empatar', num(d.veredicto.breakevenCLT));
        } else {
            add('PJ mínimo p/ empatar', num(d.veredicto.breakevenPJ));
        }

        var csvContent = '\uFEFF' + rows.join('\n');
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'comparativo-pj-clt.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
})();
