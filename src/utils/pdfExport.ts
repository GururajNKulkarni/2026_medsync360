// Branded "CEO-style" PDF completion report. Renders the same data as the Excel
// export (CompletedReferralData) into the approved HTML design and downloads a PDF
// via html2pdf.js. Kept in its own module so the heavy html2pdf/html2canvas/jsPDF
// bundle is only pulled in when a user actually requests a PDF (lazy import).
// @ts-expect-error - html2pdf.js ships no type declarations
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import type { CompletedReferralData, ReferralChainTimelineNode, CompleteMedicationTrail } from '../types/referral.types';

// Escape user-supplied strings so medication/diagnosis text can't break the HTML.
function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDateTime(ts?: string | null): string {
  return ts ? format(new Date(ts), 'MMMM d, yyyy · h:mm a') : '—';
}
function fmtTime(ts?: string | null): string {
  return ts ? format(new Date(ts), 'h:mm a') : '—';
}

// Map a medication-journey action to a timeline marker colour class.
function actionClass(action: string): string {
  if (action === 'Created Referral') return 'created';
  if (action === 'Updated During Transfer') return 'updated';
  if (action === 'Received Transfer') return 'received';
  if (action === 'Completed Referral') return 'completed';
  return 'created';
}

function buildReferralPathHtml(
  chain: ReferralChainTimelineNode[],
  fallbackFromDept: string, fallbackFromDoc: string, fallbackToDept: string, fallbackToDoc: string
): string {
  // No chain timeline -> simple From -> To (single hop).
  if (!chain.length) {
    return `
      <div class="path">
        <div class="node origin"><div class="lbl">From</div><div class="dept">${esc(fallbackFromDept)}</div><div class="doc">Dr. ${esc(fallbackFromDoc)}</div></div>
        <div class="ar">&#10142;</div>
        <div class="node final"><div class="lbl">To</div><div class="dept">${esc(fallbackToDept)}</div><div class="doc">Dr. ${esc(fallbackToDoc)}</div></div>
      </div>`;
  }
  const origin = chain[0];
  const nodes: string[] = [
    `<div class="node origin"><div class="lbl">Origin</div><div class="dept">${esc(origin.fromDepartment)}</div><div class="doc">Dr. ${esc(origin.fromDoctor)}</div></div>`,
  ];
  chain.forEach((n, i) => {
    const isFinal = i === chain.length - 1;
    const label = isFinal ? 'Final' : `Stage ${i + 1}`;
    nodes.push(`<div class="node${isFinal ? ' final' : ''}"><div class="lbl">${label}</div><div class="dept">${esc(n.toDepartment)}</div><div class="doc">Dr. ${esc(n.toDoctor)}</div></div>`);
  });
  return `<div class="path">${nodes.join('<div class="ar">&#10142;</div>')}</div>`;
}

function buildJourneyHtml(trail: CompleteMedicationTrail[]): string {
  return trail.map((s: any) => `
    <div class="tli ${actionClass(s.action_type)}">
      <div class="mk">${esc(s.step_number)}</div>
      <div class="th"><span class="ttl">${esc(s.action_type)}</span><span class="tm">${fmtDateTime(s.record_timestamp)}</span></div>
      <div class="meta2">Dr. ${esc(s.doctor_name)} — ${esc(s.department_context)}</div>
      <span class="rx">${esc(s.medication_prescribed)}</span>
      <div class="ctx">${esc(s.medication_context)}</div>
    </div>`).join('');
}

function buildStagesHtml(chain: ReferralChainTimelineNode[]): string {
  return chain.map((n, i) => {
    const isClosed = n.status === 'Closed' || !!n.endedAt;
    const lastLabel = isClosed ? 'Completed' : 'Transferred';
    const lastValue = isClosed ? fmtTime(n.endedAt) : fmtTime(n.transferredAt);
    return `
      <div class="stage${isClosed ? ' final' : ''}">
        <div class="sh"><div><span class="snum">Stage ${i + 1}</span> &nbsp;<span class="sdoc">Dr. ${esc(n.toDoctor)}</span> <span class="sdept">— ${esc(n.toDepartment)}</span></div></div>
        <div class="times">
          <div class="tcell"><div class="tl2">Received</div><div class="tv">${fmtTime(n.receivedAt)}</div></div>
          <div class="tcell"><div class="tl2">Accepted</div><div class="tv">${fmtTime(n.acceptedAt)}</div></div>
          <div class="tcell"><div class="tl2">${lastLabel}</div><div class="tv">${lastValue}</div></div>
        </div>
      </div>`;
  }).join('');
}

function calcDuration(start?: string, end?: string): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (isNaN(ms) || ms < 0) return '—';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function buildReportHtml(data: CompletedReferralData): string {
  const { referral, completionData } = data;
  const trail = data.completeMedicationTrail || [];
  const chain = data.chainTimeline || [];

  const initialMed = trail.length ? trail[0].medication_prescribed : (referral.initialMedication || referral.medicationGiven || '—');
  const finalMed = trail.length ? trail[trail.length - 1].medication_prescribed : (completionData.updatedMedication || referral.medicationGiven || '—');
  const originalDoctor = trail.length ? trail[0].doctor_name : referral.fromDoctor;
  const finalDoctor = trail.length ? trail[trail.length - 1].doctor_name : referral.doctor;
  const doctorsInvolved = trail.length ? new Set(trail.map((s: any) => s.doctor_id)).size : 0;
  const deptsInvolved = trail.length ? new Set(trail.map((s: any) => s.department_context)).size : 0;
  const attachmentsCount = referral.attachments?.length || 0;

  // Department path (consecutive dups collapsed) + transfers (holder changes).
  const deptPath: string[] = [];
  let lastDoc: string | undefined;
  let transfers = 0;
  for (const s of trail as any[]) {
    if (s.department_context && deptPath[deptPath.length - 1] !== s.department_context) deptPath.push(s.department_context);
    if (lastDoc !== undefined && s.doctor_id && s.doctor_id !== lastDoc) transfers++;
    if (s.doctor_id) lastDoc = s.doctor_id;
  }
  const createdAt = trail.length ? trail[0].record_timestamp : referral.createdAt;
  const idShort = referral.id ? `${referral.id.slice(0, 8)}…${referral.id.slice(-6)}` : '—';
  const medChanged = initialMed !== finalMed;

  return `
  <div class="page">
  <div class="hdr">
    <div class="top"><div><h1>MedSync<span>360</span></h1><div class="rtitle">Referral Completion Report</div></div></div>
    <div class="meta">Generated: ${format(new Date(), 'MMMM d, yyyy · h:mm a')}<br>Confidential — contains patient health information</div>
  </div>
  <div class="wrap">
    <div class="cards2 sec">
      <div class="card">
        <div class="ct">Patient Information</div>
        <div class="row"><span class="k">Patient Name</span><span class="v">${esc(referral.patientName)}</span></div>
        <div class="row"><span class="k">Age</span><span class="v">${esc(referral.age)} years</span></div>
        <div class="row"><span class="k">Sex</span><span class="v">${esc(referral.sex)}</span></div>
        <div class="row"><span class="k">Room No</span><span class="v">${esc(referral.roomNo || '—')}</span></div>
        <div class="row"><span class="k">Patient IP No</span><span class="v">${esc(referral.patientIpNo || '—')}</span></div>
        <div class="row"><span class="k">Admission</span><span class="v">${referral.admissionDate ? format(new Date(referral.admissionDate), 'MMMM d, yyyy') : '—'}</span></div>
      </div>
      <div class="card">
        <div class="ct">Referral Details</div>
        <div class="row"><span class="k">Referral ID</span><span class="v" style="font-size:9px;">${esc(idShort)}</span></div>
        <div class="row"><span class="k">Chief Complaint</span><span class="v">${esc(referral.chiefComplaint)}</span></div>
        <div class="row"><span class="k">Past History</span><span class="v">${esc(referral.pastHistory || '—')}</span></div>
        <div class="row"><span class="k">General Exam</span><span class="v">${esc(referral.generalExamination || '—')}</span></div>
        <div class="row"><span class="k">Urgency</span><span class="v">${esc(referral.urgency)}</span></div>
        <div class="row"><span class="k">Status</span><span class="v"><span class="pill">${esc(referral.status)}</span></span></div>
      </div>
    </div>

    <div class="sec">
      <div class="sec-h"><span class="dot"></span>Referral Path${chain.length ? ` · ${doctorsInvolved} doctors · ${chain.length} stages` : ''}</div>
      ${buildReferralPathHtml(chain, referral.fromDepartment, referral.fromDoctor, referral.department, referral.doctor)}
    </div>

    <div class="sec">
      <div class="sec-h"><span class="dot"></span>Medication Details</div>
      <div class="mstats">
        <div class="mstat"><div class="l">Initial Medication</div><div class="v">${esc(initialMed)}</div></div>
        <div class="mstat"><div class="l">Final Medication</div><div class="v">${esc(finalMed)}</div></div>
        <div class="mstat chg"><div class="l">Medication Changed</div><div class="v">${medChanged ? 'Yes' : 'No'}</div></div>
        <div class="mstat"><div class="l">Journey Steps</div><div class="v">${trail.length}</div></div>
      </div>
    </div>

    <div class="sec">
      <div class="sec-h"><span class="dot"></span>Complete Medication Journey</div>
      <div class="tl">${buildJourneyHtml(trail)}</div>
    </div>

    <div class="cards2 sec">
      <div class="card">
        <div class="ct">Medication Trail Summary</div>
        <div class="row"><span class="k">Original Doctor</span><span class="v">Dr. ${esc(originalDoctor)}</span></div>
        <div class="row"><span class="k">Original Medication</span><span class="v">${esc(initialMed)}</span></div>
        <div class="row"><span class="k">Final Doctor</span><span class="v">Dr. ${esc(finalDoctor)}</span></div>
        <div class="row"><span class="k">Final Medication</span><span class="v">${esc(finalMed)}</span></div>
        <div class="row"><span class="k">Doctors Involved</span><span class="v">${doctorsInvolved}</span></div>
        <div class="row"><span class="k">Departments Involved</span><span class="v">${deptsInvolved}</span></div>
      </div>
      <div class="card">
        <div class="ct">Completion &amp; Attendance</div>
        <div class="row"><span class="k">Patient Attended</span><span class="v">${completionData.isPatientAttended ? 'Yes — seen &amp; treated' : 'No'}</span></div>
        <div class="row"><span class="k">Completed By</span><span class="v">Dr. ${esc(completionData.completedBy)}</span></div>
        <div class="row"><span class="k">Completion Date</span><span class="v">${fmtDateTime(completionData.completedAt)}</span></div>
        <div class="row"><span class="k">Final Medication</span><span class="v">${esc(finalMed)}</span></div>
        <div class="row"><span class="k">Attachments</span><span class="v">${attachmentsCount} file${attachmentsCount === 1 ? '' : 's'}</span></div>
      </div>
    </div>

    ${(completionData.finalDiagnosisCategory || completionData.finalDiagnosisDetails) ? `
    <div class="sec">
      <div class="sec-h"><span class="dot"></span>Final Diagnosis</div>
      <div class="diag">
        <div class="cat">${esc(completionData.finalDiagnosisCategory || '—')}</div>
        <div class="det">${esc(completionData.finalDiagnosisDetails || '')}</div>
        <div class="by">Diagnosed by Dr. ${esc(completionData.finalDiagnosisBy || completionData.completedBy)} · ${fmtDateTime(completionData.finalDiagnosisTimestamp || completionData.completedAt)}</div>
      </div>
    </div>` : ''}

    ${chain.length ? `
    <div class="sec">
      <div class="sec-h"><span class="dot"></span>Timeline · Created ${fmtDateTime(createdAt)} (Dr. ${esc(chain[0].fromDoctor)})</div>
      <div class="stages">${buildStagesHtml(chain)}</div>
      <div class="stat-row">
        <div class="stat-chip"><div class="l">Departments Visited</div><div class="v">${esc(deptPath.join(' → '))}</div></div>
        <div class="stat-chip"><div class="l">Total Transfers</div><div class="v">${transfers}</div></div>
        <div class="stat-chip"><div class="l">Total Duration</div><div class="v">${calcDuration(createdAt, completionData.completedAt)}</div></div>
      </div>
    </div>` : ''}

    <div class="sec">
      <div class="sec-h"><span class="dot"></span>Summary</div>
      <div class="badges">
        <div class="badge"><div class="v">&#10004;</div><div class="l">Referral Successful</div></div>
        <div class="badge"><div class="v">&#10004;</div><div class="l">Medication Provided</div></div>
        <div class="badge"><div class="v">${attachmentsCount}</div><div class="l">Attachment${attachmentsCount === 1 ? '' : 's'}</div></div>
      </div>
    </div>

    <div class="foot">
      Report generated by MedSync 360 — Healthcare Referral Management System<br>
      For internal use only · Contains confidential patient information
    </div>
  </div>
  </div>`;
}

const REPORT_CSS = `
  * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .page { font-family:'Segoe UI', Arial, sans-serif; color:#1f2937; font-size:11px; line-height:1.4; background:#fff; width:210mm; }
  .wrap { padding:0 16mm 14mm; }
  .hdr { background:linear-gradient(135deg,#0e7490 0%,#0d9488 100%); color:#fff; padding:18px 16mm 16px; }
  .hdr .top { display:flex; justify-content:space-between; align-items:flex-start; }
  .hdr h1 { margin:0; font-size:22px; letter-spacing:.3px; }
  .hdr h1 span { color:#bbf7d0; }
  .hdr .rtitle { font-size:13px; font-weight:600; margin-top:3px; opacity:.97; }
  .hdr .meta { text-align:right; font-size:9.5px; opacity:.92; line-height:1.5; margin-top:6px; }
  .sec { margin-top:13px; }
  /* Only keep SMALL atomic blocks together across a page break. Marking whole
     sections (.sec) as unbreakable made tall sections (journey/timeline) get
     shoved across the page boundary and render blank. Let sections flow, but
     keep the short two-card rows (.cards2) atomic so the page seam can't slice a
     card and ghost/duplicate its rows. */
  .card, .cards2, .path, .mstat, .tli, .diag, .badge, .stage { page-break-inside:avoid; break-inside:avoid; }
  .sec-h { page-break-after:avoid; break-after:avoid; font-size:11px; font-weight:700; color:#0e7490; text-transform:uppercase; letter-spacing:.6px; border-bottom:2px solid #e2e8f0; padding-bottom:4px; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
  .sec-h .dot { width:8px; height:8px; border-radius:2px; background:#0d9488; }
  .row { display:flex; justify-content:space-between; border-bottom:1px dotted #e2e8f0; padding:3px 0; }
  .row .k { color:#64748b; } .row .v { color:#0f172a; font-weight:600; text-align:right; }
  .cards2 { display:flex; gap:12px; }
  .card { flex:1; background:#f8fafc; border:1px solid #e8edf2; border-radius:9px; padding:11px 13px; }
  .card .ct { font-size:10px; font-weight:700; color:#0e7490; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
  .path { display:flex; align-items:stretch; gap:6px; }
  .path .node { flex:1; background:#f0f9ff; border:1.5px solid #bae6fd; border-radius:9px; padding:8px 9px; text-align:center; }
  .path .node.origin { background:#eef2ff; border-color:#c7d2fe; }
  .path .node.final { background:#ecfdf5; border-color:#6ee7b7; }
  .path .node .lbl { font-size:8px; color:#0891b2; text-transform:uppercase; letter-spacing:.5px; font-weight:700; }
  .path .node.origin .lbl { color:#4f46e5; } .path .node.final .lbl { color:#059669; }
  .path .node .dept { font-size:10.5px; font-weight:700; color:#0c4a6e; margin-top:2px; line-height:1.25; }
  .path .node .doc { font-size:9.5px; color:#334155; margin-top:1px; }
  .path .ar { color:#0e7490; font-size:16px; font-weight:800; display:flex; align-items:center; }
  .mstats { display:flex; gap:10px; }
  .mstat { flex:1; border:1px solid #e8edf2; border-radius:9px; padding:9px 11px; background:#fff; text-align:center; }
  .mstat .l { font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:.4px; }
  .mstat .v { font-size:13px; font-weight:700; color:#0f172a; margin-top:2px; }
  .chg { background:#ecfdf5; border-color:#6ee7b7; } .chg .v { color:#065f46; }
  .tl { position:relative; margin-left:6px; }
  .tl:before { content:""; position:absolute; left:7px; top:6px; bottom:10px; width:2px; background:#cbd5e1; }
  .tli { position:relative; padding:0 0 12px 28px; }
  .tli .mk { position:absolute; left:0; top:2px; width:16px; height:16px; border-radius:50%; background:#0e7490; color:#fff; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 3px #fff; }
  .tli.created .mk{background:#f59e0b;} .tli.updated .mk{background:#7c3aed;} .tli.received .mk{background:#0891b2;} .tli.completed .mk{background:#0d9488;}
  .tli .th { display:flex; justify-content:space-between; }
  .tli .ttl { font-weight:700; color:#0f172a; font-size:11.5px; }
  .tli .tm { color:#64748b; font-size:10px; }
  .tli .meta2 { font-size:10.5px; color:#334155; margin-top:1px; }
  .tli .rx { display:inline-block; margin-top:3px; background:#f0f9ff; border:1px solid #bae6fd; color:#0c4a6e; font-size:10px; font-weight:600; padding:2px 8px; border-radius:6px; }
  .tli .ctx { font-size:9.5px; color:#64748b; font-style:italic; margin-top:2px; }
  .diag { background:#ecfdf5; border:1px solid #6ee7b7; border-radius:9px; padding:11px 13px; }
  .diag .cat { font-size:13px; font-weight:800; color:#065f46; }
  .diag .det { font-size:11px; color:#334155; margin-top:2px; }
  .diag .by { font-size:9.5px; color:#047857; margin-top:5px; }
  .stages { display:flex; flex-direction:column; gap:8px; }
  .stage { border:1px solid #e8edf2; border-radius:9px; padding:9px 12px; background:#fafcff; }
  .stage.final { background:#ecfdf5; border-color:#6ee7b7; }
  .stage .sh { display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; }
  .stage .snum { display:inline-block; font-size:10px; font-weight:800; color:#fff; background:#0e7490; padding:3px 10px; border-radius:8px; letter-spacing:.5px; line-height:1.5; vertical-align:middle; }
  .stage.final .snum { background:#059669; }
  .stage .sdoc { font-size:11px; font-weight:700; color:#0f172a; }
  .stage .sdept { font-size:9.5px; color:#64748b; }
  .stage .times { display:flex; gap:8px; }
  .stage .tcell { flex:1; }
  .stage .tcell .tl2 { font-size:8.5px; color:#64748b; text-transform:uppercase; letter-spacing:.4px; }
  .stage .tcell .tv { font-size:10.5px; font-weight:600; color:#0f172a; margin-top:1px; }
  .stat-row { display:flex; gap:10px; margin-top:10px; }
  .stat-chip { flex:1; background:#f1f5f9; border-radius:8px; padding:7px 10px; }
  .stat-chip .l { font-size:8.5px; color:#64748b; text-transform:uppercase; letter-spacing:.4px; }
  .stat-chip .v { font-size:11px; font-weight:700; color:#0f172a; margin-top:1px; }
  .badges { display:flex; gap:10px; }
  .badge { flex:1; background:#0e7490; color:#fff; border-radius:9px; padding:10px; text-align:center; }
  .badge .v { font-size:15px; font-weight:800; } .badge .l { font-size:9px; opacity:.9; }
  .pill { display:inline-block; background:#dcfce7; color:#166534; font-weight:700; font-size:10px; padding:2px 9px; border-radius:10px; }
  .foot { margin-top:16px; border-top:1px solid #e2e8f0; padding-top:8px; text-align:center; font-size:9px; color:#94a3b8; }
`;

export const generateReferralPdfReport = async (data: CompletedReferralData): Promise<void> => {
  if (!data?.referral?.patientName) {
    throw new Error('Missing referral data - cannot generate PDF');
  }

  // Render into an off-screen container so html2canvas can rasterise it.
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#fff';
  const style = document.createElement('style');
  style.textContent = REPORT_CSS;
  container.appendChild(style);
  const content = document.createElement('div');
  content.innerHTML = buildReportHtml(data);
  container.appendChild(content);
  document.body.appendChild(container);

  const safeName = data.referral.patientName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 30);
  const filename = `Referral_${safeName}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        // scale 3 + fixed windowWidth (210mm ≈ 794px) = crisper text and a
        // layout that doesn't depend on the browser's current window size.
        html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // avoid[] tells html2pdf which blocks must not be split across the seam
        // (reinforces the CSS) so cards/steps/stages never ghost onto two pages.
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.cards2', '.card', '.tli', '.stage', '.diag', '.mstat', '.badge', '.path'] },
      })
      .from(content)
      .save();
  } finally {
    document.body.removeChild(container);
  }
};

export default { generateReferralPdfReport };
