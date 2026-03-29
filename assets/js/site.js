
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  const fields = ['SA','PA','SP','IP','Additional'];
  const disciplines = ['accounting','economics','finance','management','marketing','analytics','other'];

  function numberVal(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  function fmt(n, digits=1){
    return `${Number(n).toFixed(digits)}%`;
  }

  function renderUndergradDisciplineInputs(){
    const wrap = document.getElementById('ug-discipline-inputs');
    if(!wrap) return;
    wrap.innerHTML = '';
    disciplines.forEach((disc, idx) => {
      const title = disc.charAt(0).toUpperCase() + disc.slice(1);
      const card = document.createElement('div');
      card.className = 'discipline-card';
      let inner = `
        <div class="discipline-header">
          <h4>${title}</h4>
          <span class="small">Share of undergraduate sections</span>
        </div>
        <div class="form-grid">
          <div>
            <label>${title} section %<input type="number" min="0" max="100" step="0.1" id="ug-pct-${disc}" value="${disc==='management' ? 20 : disc==='marketing' ? 18 : disc==='finance' ? 16 : disc==='accounting' ? 15 : disc==='analytics' ? 12 : disc==='economics' ? 10 : 9}"></label>
          </div>
          <div class="muted-box">
            Enter faculty counts by qualification and normal annual section load for this discipline.
          </div>
        </div>
        <div class="form-grid-5">`;
      fields.forEach((field, i) => {
        const defaults = {SA:2,PA:1,SP:0,IP:1,Additional:0};
        const loads = {SA:6,PA:6,SP:6,IP:8,Additional:0};
        inner += `
          <div>
            <label>${field} count<input type="number" min="0" step="1" id="ug-${disc}-${field}-count" value="${defaults[field] ?? 0}"></label>
            <label>${field} load<input type="number" min="0" step="0.1" id="ug-${disc}-${field}-load" value="${loads[field] ?? 0}"></label>
          </div>`;
      });
      inner += `</div>`;
      card.innerHTML = inner;
      wrap.appendChild(card);
    });
  }

  function calcUndergrad(){
    const output = document.getElementById('ug-results');
    if(!output) return;
    const totalSections = numberVal(document.getElementById('ug-total-sections').value);
    if(totalSections <= 0){
      output.className = 'result-box alert';
      output.innerHTML = '<strong>Please enter total undergraduate sections offered.</strong>';
      return;
    }

    let pctSum = 0;
    let overallP = 0, overallS = 0;
    let qualTotals = {SA:0,PA:0,SP:0,IP:0,Additional:0};
    let rows = '';
    let fulltimeCapacity = 0;

    disciplines.forEach(disc => {
      const pct = numberVal(document.getElementById(`ug-pct-${disc}`).value);
      pctSum += pct;
      const discSections = totalSections * pct / 100;
      let pSections = 0;
      let counts = {};
      fields.forEach(field => {
        const count = numberVal(document.getElementById(`ug-${disc}-${field}-count`).value);
        const load = numberVal(document.getElementById(`ug-${disc}-${field}-load`).value);
        counts[field] = count;
        qualTotals[field] += count;
        pSections += count * load;
        if(field !== 'Additional') fulltimeCapacity += count * load;
      });
      const supporting = Math.max(0, discSections - pSections);
      const overAssigned = pSections > discSections + 1e-9;
      overallP += Math.min(pSections, discSections);
      overallS += supporting;

      const facultyCountTotal = counts.SA + counts.PA + counts.SP + counts.IP + counts.Additional;
      const saPct = facultyCountTotal ? counts.SA / facultyCountTotal * 100 : 0;
      const qualifiedPct = facultyCountTotal ? (counts.SA + counts.PA + counts.SP + counts.IP) / facultyCountTotal * 100 : 0;
      const pRatio = discSections ? Math.min(pSections, discSections) / discSections * 100 : 0;

      rows += `<tr>
        <td>${disc.charAt(0).toUpperCase()+disc.slice(1)}</td>
        <td>${discSections.toFixed(1)}</td>
        <td>${Math.min(pSections, discSections).toFixed(1)}</td>
        <td>${supporting.toFixed(1)}</td>
        <td>${fmt(pRatio)}</td>
        <td>${fmt(saPct)}</td>
        <td>${fmt(qualifiedPct)}</td>
        <td>${overAssigned ? '<span style="color:#b42318;font-weight:700">Check inputs</span>' : 'OK'}</td>
      </tr>`;
    });

    if(Math.abs(pctSum - 100) > 0.01){
      output.className = 'result-box alert';
      output.innerHTML = `<strong>The discipline percentages must add up to 100%.</strong><br>Current total: ${pctSum.toFixed(1)}%`;
      return;
    }

    const adjunctIP = Math.ceil(overallS);
    qualTotals.IP += adjunctIP;
    const overallFaculty = qualTotals.SA + qualTotals.PA + qualTotals.SP + qualTotals.IP + qualTotals.Additional;
    const overallPRatio = (overallP / totalSections) * 100;
    const overallSARatio = overallFaculty ? qualTotals.SA / overallFaculty * 100 : 0;
    const overallQualifiedRatio = overallFaculty ? (qualTotals.SA + qualTotals.PA + qualTotals.SP + qualTotals.IP) / overallFaculty * 100 : 0;
    const tooMany = fulltimeCapacity > totalSections + 1e-9;

    const meetsP = overallPRatio >= 75;
    const meetsSA = overallSARatio >= 40;
    const meetsQualified = overallQualifiedRatio >= 90;

    output.className = `result-box ${tooMany ? 'alert' : (meetsP && meetsSA && meetsQualified ? 'good' : '')}`;
    output.innerHTML = `
      <h4>Undergraduate coverage results</h4>
      <p><strong>Overall participating coverage:</strong> ${fmt(overallPRatio)} ${meetsP ? '✓' : '✗'}<br>
      <strong>Overall SA ratio:</strong> ${fmt(overallSARatio)} ${meetsSA ? '✓' : '✗'}<br>
      <strong>Overall SA+PA+SP+IP ratio:</strong> ${fmt(overallQualifiedRatio)} ${meetsQualified ? '✓' : '✗'}</p>
      <p><strong>Adjunct assumption applied:</strong> ${adjunctIP} IP adjunct faculty at one section each were added to cover remaining unassigned sections.</p>
      ${tooMany ? '<p><strong>Warning:</strong> Full-time faculty teaching capacity exceeds total undergraduate sections offered. Please double-check loads and section counts.</p>' : ''}
      <div style="overflow:auto">
        <table style="width:100%; border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Discipline</th>
              <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Sections</th>
              <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Participating</th>
              <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Supporting/IP Adjunct</th>
              <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">P Ratio</th>
              <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">SA Ratio</th>
              <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Qualified Ratio</th>
              <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Check</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function calcGraduate(){
    const output = document.getElementById('grad-results');
    if(!output) return;
    const totalSections = numberVal(document.getElementById('grad-total-sections').value);
    if(totalSections <= 0){
      output.className = 'result-box alert';
      output.innerHTML = '<strong>Please enter total graduate sections offered in the target program.</strong>';
      return;
    }
    let qualTotals = {SA:0,PA:0,SP:0,IP:0,Additional:0};
    let covered = 0;
    let rows = '';
    let fulltimeCapacity = 0;
    fields.forEach(field => {
      const faculty = numberVal(document.getElementById(`grad-${field}-count`).value);
      const avg = numberVal(document.getElementById(`grad-${field}-avg`).value);
      const sections = faculty * avg;
      qualTotals[field] += faculty;
      covered += sections;
      if(field !== 'Additional') fulltimeCapacity += sections;
      rows += `<tr>
        <td>${field}</td>
        <td>${faculty}</td>
        <td>${avg.toFixed(1)}</td>
        <td>${sections.toFixed(1)}</td>
      </tr>`;
    });

    const remaining = Math.max(0, totalSections - covered);
    const adjunctIP = Math.ceil(remaining);
    qualTotals.IP += adjunctIP;
    const overallFaculty = qualTotals.SA + qualTotals.PA + qualTotals.SP + qualTotals.IP + qualTotals.Additional;
    const participatingSections = Math.min(covered, totalSections);
    const supportingSections = remaining;
    const pRatio = participatingSections / totalSections * 100;
    const saRatio = overallFaculty ? qualTotals.SA / overallFaculty * 100 : 0;
    const qualifiedRatio = overallFaculty ? (qualTotals.SA + qualTotals.PA + qualTotals.SP + qualTotals.IP) / overallFaculty * 100 : 0;
    const tooMany = fulltimeCapacity > totalSections + 1e-9;

    output.className = `result-box ${tooMany ? 'alert' : ((pRatio >= 75 && saRatio >= 40 && qualifiedRatio >= 90) ? 'good' : '')}`;
    output.innerHTML = `
      <h4>Graduate program coverage results</h4>
      <p><strong>Participating coverage:</strong> ${fmt(pRatio)}<br>
      <strong>SA ratio:</strong> ${fmt(saRatio)}<br>
      <strong>SA+PA+SP+IP ratio:</strong> ${fmt(qualifiedRatio)}</p>
      <p><strong>Adjunct assumption applied:</strong> ${adjunctIP} IP adjunct faculty at one section each were added for uncovered sections in the program.</p>
      ${tooMany ? '<p><strong>Warning:</strong> Faculty count × average sections exceeds the total sections entered for the program. Please double-check the assumptions.</p>' : ''}
      <div style="overflow:auto">
        <table style="width:100%; border-collapse:collapse">
          <thead><tr>
            <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Qualification</th>
            <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Faculty</th>
            <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Avg. sections in program</th>
            <th style="text-align:left; border-bottom:1px solid #cbd5da; padding:.5rem">Covered sections</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function calcEstimator(){
    const output = document.getElementById('fq-results');
    if(!output) return;
    const terminal = document.getElementById('terminal-degree').value;
    const masters = document.getElementById('masters-degree').value;
    const substantial = document.getElementById('substantial-experience').value;
    const scholarly = document.getElementById('sustained-scholarly').value;
    const academic = document.getElementById('sustained-academic').value;
    const professional = document.getElementById('sustained-professional').value;
    const teaching = document.getElementById('teaching-effective').value;

    let category = 'Additional';
    let rationale = 'Based on the current answers, the faculty member does not clearly align with SA, PA, SP, or IP.';
    if (terminal === 'yes' && scholarly === 'yes' && teaching === 'yes') {
      category = 'Scholarly Academic (SA)';
      rationale = 'Terminal degree in a closely related field plus sustained scholarly activity and teaching effectiveness.';
    } else if (terminal === 'yes' && academic === 'yes' && teaching === 'yes') {
      category = 'Practice Academic (PA)';
      rationale = 'Terminal degree in a closely related field plus ongoing sustained academic activities and teaching effectiveness.';
    } else if (masters === 'yes' && substantial === 'yes' && scholarly === 'yes' && professional === 'yes' && teaching === 'yes') {
      category = 'Scholarly Practitioner (SP)';
      rationale = 'Master’s degree, substantial relevant professional experience, sustained scholarly publication activity, professional engagement, and teaching effectiveness.';
    } else if (masters === 'yes' && substantial === 'yes' && professional === 'yes' && teaching === 'yes') {
      category = 'Instructional Practitioner (IP)';
      rationale = 'Master’s degree, substantial relevant professional experience, ongoing professional engagement, and teaching effectiveness.';
    }

    output.className = `result-box ${category === 'Additional' ? 'alert' : 'good'}`;
    output.innerHTML = `<h4>Estimated faculty category</h4><p><strong>${category}</strong></p><p>${rationale}</p><p class="small">This is a practical screening tool, not a substitute for school-specific criteria or peer-review judgment.</p>`;
  }

  renderUndergradDisciplineInputs();
  document.getElementById('ug-calc-btn')?.addEventListener('click', calcUndergrad);
  document.getElementById('grad-calc-btn')?.addEventListener('click', calcGraduate);
  document.getElementById('fq-calc-btn')?.addEventListener('click', calcEstimator);
  document.getElementById('ug-reset-btn')?.addEventListener('click', () => { renderUndergradDisciplineInputs(); document.getElementById('ug-results').innerHTML=''; document.getElementById('ug-results').className='result-box'; });
  document.getElementById('grad-reset-btn')?.addEventListener('click', () => { document.getElementById('grad-form').reset(); document.getElementById('grad-results').innerHTML=''; document.getElementById('grad-results').className='result-box'; });
  document.getElementById('fq-reset-btn')?.addEventListener('click', () => { document.getElementById('fq-form').reset(); document.getElementById('fq-results').innerHTML=''; document.getElementById('fq-results').className='result-box'; });
});
