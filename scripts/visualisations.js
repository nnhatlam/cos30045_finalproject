// ============================================================
// visualisations.js — D3 interactive charts for data.html
// Australian Mobile Phone Fines — COS30045 Final Project
// ============================================================

// ---------- colour palette aligned with CSS variables ----------
const PALETTE = {
  jurisdictions: {
    ACT: "#3b79b5",
    NSW: "#2e9b66",
    NT:  "#e06b3b",
    QLD: "#9b59b6",
    SA:  "#e8b84b",
    TAS: "#1abc9c",
    VIC: "#e74c3c",
    WA:  "#2980b9",
  },
  ageGroups: ["#3b79b5","#2e9b66","#e06b3b","#9b59b6","#e8b84b"],
  camera: "#2e9b66",
  police: "#3b79b5",
  arrest: "#e74c3c",
  charges: "#e06b3b",
};

const JURISDICTIONS = ["ACT","NSW","NT","QLD","SA","TAS","VIC","WA"];
const AGE_GROUPS    = ["0-16","17-25","26-39","40-64","65 and over"];

// ---------- shared tooltip ----------
const tooltip = d3.select("body")
  .append("div")
  .attr("id", "d3-tooltip")
  .style("position","fixed")
  .style("pointer-events","none")
  .style("background","rgba(6,38,84,0.92)")
  .style("color","#edf4ff")
  .style("border","1px solid rgba(255,255,255,0.18)")
  .style("border-radius","10px")
  .style("padding","0.6rem 0.85rem")
  .style("font-size","0.88rem")
  .style("line-height","1.55")
  .style("box-shadow","0 8px 24px rgba(0,0,0,0.3)")
  .style("backdrop-filter","blur(8px)")
  .style("z-index","9999")
  .style("opacity",0)
  .style("transition","opacity 0.18s ease");

function showTip(html, event) {
  tooltip.html(html).style("opacity",1);
  moveTip(event);
}
function moveTip(event) {
  const x = event.clientX, y = event.clientY;
  const tw = 220, th = 80;
  const left = x + 14 + tw > window.innerWidth  ? x - tw - 10 : x + 14;
  const top  = y + 14 + th > window.innerHeight ? y - th - 10 : y + 14;
  tooltip.style("left", left+"px").style("top", top+"px");
}
function hideTip() { tooltip.style("opacity",0); }

// ============================================================
// 1. DONUT CHART — Fines by Age Group
// ============================================================
async function drawDonut() {
  const raw = await d3.csv("data/fines_by_age_group.csv", d => ({
    age: d["AGE_GROUP"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  const container = document.getElementById("chart-donut");
  const W = container.offsetWidth || 420;
  const H = 320;
  const R = Math.min(W, H) / 2 - 32;

  const svg = d3.select("#chart-donut")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`)
    .attr("aria-label","Donut chart showing fines by age group");

  const g = svg.append("g").attr("transform",`translate(${W*0.42},${H/2})`);

  const pie   = d3.pie().value(d => d.fines).sort(null);
  const arc   = d3.arc().innerRadius(R*0.55).outerRadius(R);
  const arcHi = d3.arc().innerRadius(R*0.55).outerRadius(R+10);

  const total = d3.sum(raw, d => d.fines);

  const arcs = g.selectAll("path")
    .data(pie(raw)).enter().append("path")
    .attr("d", arc)
    .attr("fill", (d,i) => PALETTE.ageGroups[i])
    .attr("stroke","#fff").attr("stroke-width",2)
    .style("cursor","pointer")
    .style("transition","transform 0.22s ease")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("d", arcHi);
      showTip(`<strong>${d.data.age}</strong><br>${d3.format(",")(d.data.fines)} fines<br>${((d.data.fines/total)*100).toFixed(1)}% of total`, event);
    })
    .on("mousemove", (e) => moveTip(e))
    .on("mouseout",  function(event, d) {
      d3.select(this).attr("d", arc);
      hideTip();
    });

  // centre label
  g.append("text").attr("text-anchor","middle").attr("dy","-0.3em")
    .style("font-size","1.4rem").style("font-weight","700")
    .style("fill","#0d5f66")
    .text(d3.format(",")(total));
  g.append("text").attr("text-anchor","middle").attr("dy","1.2em")
    .style("font-size","0.78rem").style("fill","#1f5f97")
    .text("Total fines");

  // legend
  const legend = svg.append("g").attr("transform",`translate(${W*0.72},${H*0.15})`);
  raw.forEach((d,i) => {
    const row = legend.append("g").attr("transform",`translate(0,${i*26})`);
    row.append("rect").attr("width",13).attr("height",13).attr("rx",3)
      .attr("fill", PALETTE.ageGroups[i]);
    row.append("text").attr("x",18).attr("y",11)
      .style("font-size","0.8rem").style("fill","#18222d")
      .text(d.age);
  });

  // animate in
  arcs.each(function(d) {
    const self = d3.select(this);
    const len  = this.getTotalLength ? this.getTotalLength() : 0;
    self.attr("opacity",0)
      .transition().duration(600).delay((_,i) => i*100)
      .attr("opacity",1);
  });
}

// ============================================================
// 2. GROUPED BAR — Arrests & Charges by Age Group
// ============================================================
async function drawGroupedBar() {
  const raw = await d3.csv("data/grouped_charges_and_arrest_by_age_group.csv", d => ({
    age:     d["AGE_GROUP"].trim(),
    arrests: +d["Sum(ARRESTS)"],
    charges: +d["Sum(CHARGES)"],
  }));

  const container = document.getElementById("chart-grouped");
  const W = container.offsetWidth || 480;
  const H = 300;
  const margin = {top:24, right:24, bottom:50, left:48};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top  - margin.bottom;

  const svg = d3.select("#chart-grouped")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`)
    .attr("aria-label","Grouped bar chart: arrests and charges by age group");

  const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const x0  = d3.scaleBand().domain(AGE_GROUPS).range([0,iw]).padding(0.28);
  const x1  = d3.scaleBand().domain(["arrests","charges"]).rangeRound([0, x0.bandwidth()]).padding(0.08);
  const yMax = d3.max(raw, d => Math.max(d.arrests, d.charges));
  const y   = d3.scaleLinear().domain([0, yMax*1.12]).range([ih,0]);

  // gridlines
  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).tickSize(-iw).tickFormat(""))
    .selectAll("line").style("stroke","rgba(0,0,0,0.07)");
  g.select(".grid .domain").remove();

  // axes
  g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x0).tickSize(0))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");
  g.append("g").call(d3.axisLeft(y).ticks(5))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");

  const series = [
    { key:"arrests", color: PALETTE.arrest,  label:"Arrests"  },
    { key:"charges", color: PALETTE.charges,  label:"Charges"  },
  ];

  series.forEach(s => {
    g.selectAll(`.bar-${s.key}`)
      .data(raw).enter().append("rect")
      .attr("class", `bar-${s.key}`)
      .attr("x",     d => x0(d.age) + x1(s.key))
      .attr("y",     ih)
      .attr("width", x1.bandwidth())
      .attr("height",0)
      .attr("fill",  s.color)
      .attr("rx",    4)
      .style("cursor","pointer")
      .on("mouseover",(e,d) => showTip(`<strong>${d.age}</strong><br>${s.label}: <strong>${d[s.key]}</strong>`,e))
      .on("mousemove",(e)   => moveTip(e))
      .on("mouseout", ()    => hideTip())
      .transition().duration(700).delay((_,i) => i*60)
      .attr("y",      d => y(d[s.key]))
      .attr("height", d => ih - y(d[s.key]));
  });

  // legend
  const leg = svg.append("g").attr("transform",`translate(${margin.left},${H-12})`);
  series.forEach((s,i) => {
    const lx = i * 110;
    leg.append("rect").attr("x",lx).attr("y",-10).attr("width",12).attr("height",12).attr("rx",3).attr("fill",s.color);
    leg.append("text").attr("x",lx+16).attr("y",0).style("font-size","0.78rem").style("fill","#18222d").text(s.label);
  });
}

// ============================================================
// 3. STACKED BAR — Fines by Jurisdiction & Age Group
// ============================================================
async function drawStackedBar() {
  const raw = await d3.csv("data/grouped_fine_by_jurisdiction_and_age.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    age:  d["AGE_GROUP"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  // filter out "All ages" totals
  const filtered = raw.filter(d => d.age !== "All ages");

  const container = document.getElementById("chart-stacked");
  const W = container.offsetWidth || 520;
  const H = 340;
  const margin = {top:24, right:20, bottom:54, left:66};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top  - margin.bottom;

  // pivot
  const byJur = d3.group(filtered, d => d.jurisdiction);
  const pivoted = JURISDICTIONS.map(j => {
    const rows = byJur.get(j) || [];
    const obj  = { jurisdiction: j };
    AGE_GROUPS.forEach(a => {
      const row = rows.find(r => r.age === a);
      obj[a] = row ? row.fines : 0;
    });
    return obj;
  });

  const stack  = d3.stack().keys(AGE_GROUPS);
  const series = stack(pivoted);

  const svg = d3.select("#chart-stacked")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`)
    .attr("aria-label","Stacked bar chart: fines by jurisdiction and age group");

  const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(JURISDICTIONS).range([0,iw]).padding(0.22);
  const yMax = d3.max(series[series.length-1], d => d[1]);
  const y = d3.scaleLinear().domain([0, yMax*1.1]).range([ih,0]);

  // gridlines
  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).tickSize(-iw).tickFormat(""))
    .selectAll("line").style("stroke","rgba(0,0,0,0.07)");
  g.select(".grid .domain").remove();

  g.append("g").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(x).tickSize(0))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");
  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");

  series.forEach((layer, i) => {
    g.selectAll(`.rect-${i}`)
      .data(layer).enter().append("rect")
      .attr("class",`rect-${i}`)
      .attr("x",    d => x(d.data.jurisdiction))
      .attr("y",    ih)
      .attr("width",x.bandwidth())
      .attr("height",0)
      .attr("fill", PALETTE.ageGroups[i])
      .attr("rx", i === 0 ? 4 : 0)
      .style("cursor","pointer")
      .on("mouseover",(e,d) => showTip(
        `<strong>${d.data.jurisdiction}</strong><br>${AGE_GROUPS[i]}: <strong>${d3.format(",")(d[1]-d[0])}</strong>`,e))
      .on("mousemove",(e)   => moveTip(e))
      .on("mouseout", ()    => hideTip())
      .transition().duration(700).delay((_,j) => j*60)
      .attr("y",      d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]));
  });

  // legend
  const leg = svg.append("g").attr("transform",`translate(${margin.left},${H-10})`);
  AGE_GROUPS.forEach((a,i) => {
    const lx = i * (iw / AGE_GROUPS.length);
    leg.append("rect").attr("x",lx).attr("y",-10).attr("width",12).attr("height",12).attr("rx",3)
      .attr("fill", PALETTE.ageGroups[i]);
    leg.append("text").attr("x",lx+16).attr("y",0).style("font-size","0.72rem").style("fill","#18222d").text(a);
  });
}

// ============================================================
// 4. GROUPED BAR — Detection Method by Jurisdiction
// ============================================================
async function drawDetectionBar() {
  const raw = await d3.csv("data/grouped_fine_by_jurisdiction_and_detection.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    method: d["DETECTION_METHOD"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  // build pivot: {jurisdiction, Camera issued, Police issued}
  const byJur = d3.group(raw, d => d.jurisdiction);
  const pivoted = [];
  byJur.forEach((rows, j) => {
    const obj = { jurisdiction: j };
    rows.forEach(r => { obj[r.method] = r.fines; });
    obj["Camera issued"]  = obj["Camera issued"]  || 0;
    obj["Police issued"]  = obj["Police issued"]  || 0;
    pivoted.push(obj);
  });
  pivoted.sort((a,b) => (b["Camera issued"]+b["Police issued"]) - (a["Camera issued"]+a["Police issued"]));

  const jurs = pivoted.map(d => d.jurisdiction);

  const container = document.getElementById("chart-detection");
  const W = container.offsetWidth || 520;
  const H = 300;
  const margin = {top:24, right:24, bottom:50, left:72};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top  - margin.bottom;

  const svg = d3.select("#chart-detection")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`)
    .attr("aria-label","Grouped bar chart: fines by detection method per jurisdiction");

  const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const methods = ["Camera issued","Police issued"];
  const x0 = d3.scaleBand().domain(jurs).range([0,iw]).padding(0.28);
  const x1 = d3.scaleBand().domain(methods).rangeRound([0, x0.bandwidth()]).padding(0.06);
  const yMax = d3.max(pivoted, d => Math.max(d["Camera issued"], d["Police issued"]));
  const y = d3.scaleLinear().domain([0, yMax*1.12]).range([ih,0]);

  // gridlines
  g.append("g").attr("class","grid")
    .call(d3.axisLeft(y).tickSize(-iw).tickFormat(""))
    .selectAll("line").style("stroke","rgba(0,0,0,0.07)");
  g.select(".grid .domain").remove();

  g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x0).tickSize(0))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");
  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");

  const colors = { "Camera issued": PALETTE.camera, "Police issued": PALETTE.police };

  methods.forEach(m => {
    g.selectAll(`.bar-det-${m.replace(/\s+/g,"-")}`)
      .data(pivoted).enter().append("rect")
      .attr("x",     d => x0(d.jurisdiction) + x1(m))
      .attr("y",     ih)
      .attr("width", x1.bandwidth())
      .attr("height",0)
      .attr("fill",  colors[m])
      .attr("rx",    4)
      .style("cursor","pointer")
      .on("mouseover",(e,d) => showTip(`<strong>${d.jurisdiction}</strong><br>${m}: <strong>${d3.format(",")(d[m])}</strong>`,e))
      .on("mousemove",(e)   => moveTip(e))
      .on("mouseout", ()    => hideTip())
      .transition().duration(700).delay((_,i) => i*60)
      .attr("y",      d => y(d[m]))
      .attr("height", d => ih - y(d[m]));
  });

  // legend
  const leg = svg.append("g").attr("transform",`translate(${margin.left},${H-10})`);
  methods.forEach((m,i) => {
    const lx = i * 150;
    leg.append("rect").attr("x",lx).attr("y",-10).attr("width",12).attr("height",12).attr("rx",3).attr("fill",colors[m]);
    leg.append("text").attr("x",lx+16).attr("y",0).style("font-size","0.78rem").style("fill","#18222d").text(m);
  });
}

// ============================================================
// 5. HORIZONTAL BAR — Arrest & Charge Rate by Jurisdiction
// ============================================================
async function drawRateChart() {
  const raw = await d3.csv("data/charges_and_arrest_rate_by_jurisdiction.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    arrest:  +d["Arrest_Rate"],
    charges: +d["Charges_rate"],
  }));

  // filter out zero-zero rows
  const data = raw.filter(d => d.arrest > 0 || d.charges > 0);

  const container = document.getElementById("chart-rates");
  const W = container.offsetWidth || 480;
  const H = 300;
  const margin = {top:24, right:32, bottom:30, left:42};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top  - margin.bottom;

  const svg = d3.select("#chart-rates")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`)
    .attr("aria-label","Horizontal bar chart: enforcement rates by jurisdiction");

  const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const jurs = data.map(d => d.jurisdiction);
  const y0  = d3.scaleBand().domain(jurs).range([0,ih]).padding(0.26);
  const y1  = d3.scaleBand().domain(["arrest","charges"]).rangeRound([0, y0.bandwidth()]).padding(0.06);
  const xMax = d3.max(data, d => Math.max(d.arrest, d.charges));
  const x   = d3.scaleLinear().domain([0, xMax*1.1]).range([0,iw]);

  g.append("g").attr("class","grid")
    .call(d3.axisBottom(x).tickSize(ih).tickFormat(""))
    .attr("transform","translate(0,0)")
    .selectAll("line").style("stroke","rgba(0,0,0,0.07)");
  g.selectAll(".grid .domain").remove();

  g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(5))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");
  g.append("g").call(d3.axisLeft(y0).tickSize(0))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");

  const series = [
    { key:"arrest",  color: PALETTE.arrest,  label:"Arrest Rate"  },
    { key:"charges", color: PALETTE.charges,  label:"Charges Rate" },
  ];

  series.forEach(s => {
    g.selectAll(`.hbar-${s.key}`)
      .data(data).enter().append("rect")
      .attr("y", d => y0(d.jurisdiction) + y1(s.key))
      .attr("x",  0)
      .attr("width",  0)
      .attr("height", y1.bandwidth())
      .attr("fill",   s.color)
      .attr("rx",     3)
      .style("cursor","pointer")
      .on("mouseover",(e,d) => showTip(`<strong>${d.jurisdiction}</strong><br>${s.label}: <strong>${d[s.key]}%</strong>`,e))
      .on("mousemove",(e)   => moveTip(e))
      .on("mouseout", ()    => hideTip())
      .transition().duration(700).delay((_,i) => i*80)
      .attr("width", d => x(d[s.key]));

    // value labels
    g.selectAll(`.label-${s.key}`)
      .data(data).enter().append("text")
      .attr("y",  d => y0(d.jurisdiction) + y1(s.key) + y1.bandwidth()/2 + 4)
      .attr("x",  d => x(d[s.key]) + 5)
      .style("font-size","0.72rem").style("fill","#18222d")
      .text(d => d[s.key]);
  });

  // legend
  const leg = svg.append("g").attr("transform",`translate(${margin.left},${H-6})`);
  series.forEach((s,i) => {
    const lx = i * 130;
    leg.append("rect").attr("x",lx).attr("y",-10).attr("width",12).attr("height",12).attr("rx",3).attr("fill",s.color);
    leg.append("text").attr("x",lx+16).attr("y",0).style("font-size","0.78rem").style("fill","#18222d").text(s.label);
  });
}

// ============================================================
// 6. HEATMAP — Fines per Jurisdiction × Age (normalised)
// ============================================================
async function drawHeatmap() {
  const raw = await d3.csv("data/grouped_fine_by_jurisdiction_and_age.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    age:   d["AGE_GROUP"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  const filtered = raw.filter(d => d.age !== "All ages" && d.fines > 0);

  const container = document.getElementById("chart-heatmap");
  const W = container.offsetWidth || 520;
  const H = 300;
  const margin = {top:12, right:20, bottom:60, left:52};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top  - margin.bottom;

  const svg = d3.select("#chart-heatmap")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`)
    .attr("aria-label","Heatmap of fines by jurisdiction and age group");

  const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(JURISDICTIONS).range([0,iw]).padding(0.06);
  const y = d3.scaleBand().domain(AGE_GROUPS).range([0,ih]).padding(0.06);
  const maxVal = d3.max(filtered, d => d.fines);
  const color  = d3.scaleSequential(d3.interpolateBlues).domain([0, maxVal]);

  g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0))
    .select(".domain").remove();
  g.append("g").call(d3.axisLeft(y).tickSize(0))
    .select(".domain").remove();

  g.selectAll("rect.cell")
    .data(filtered).enter().append("rect")
    .attr("class","cell")
    .attr("x", d => x(d.jurisdiction))
    .attr("y", d => y(d.age))
    .attr("width",  x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 4)
    .attr("fill","rgba(255,255,255,0)")
    .style("cursor","pointer")
    .on("mouseover",(e,d) => showTip(`<strong>${d.jurisdiction}</strong> — ${d.age}<br>Fines: <strong>${d3.format(",")(d.fines)}</strong>`,e))
    .on("mousemove",(e)   => moveTip(e))
    .on("mouseout", ()    => hideTip())
    .transition().duration(800).delay((_,i) => i*20)
    .attr("fill", d => color(d.fines));

  // colour legend bar
  const defs   = svg.append("defs");
  const lgId   = "heatmap-gradient";
  const lgGrad = defs.append("linearGradient").attr("id",lgId);
  lgGrad.selectAll("stop")
    .data([0,0.25,0.5,0.75,1]).enter().append("stop")
    .attr("offset", d => `${d*100}%`)
    .attr("stop-color", d => d3.interpolateBlues(d));

  const barW = iw * 0.45;
  svg.append("rect")
    .attr("x", margin.left + iw*0.55).attr("y", H-28)
    .attr("width", barW).attr("height", 10).attr("rx",3)
    .attr("fill",`url(#${lgId})`);
  svg.append("text").attr("x", margin.left + iw*0.55).attr("y", H-32)
    .style("font-size","0.7rem").style("fill","#18222d").text("0");
  svg.append("text").attr("x", margin.left + iw*0.55 + barW).attr("y", H-32)
    .attr("text-anchor","end")
    .style("font-size","0.7rem").style("fill","#18222d").text(d3.format(".2s")(maxVal));
  svg.append("text").attr("x", margin.left + iw*0.55 + barW/2).attr("y", H-32)
    .attr("text-anchor","middle")
    .style("font-size","0.68rem").style("fill","#1f5f97").text("Fines count");
}

// ============================================================
// Intersection-observer: animate when chart enters viewport
// ============================================================
function observeCharts() {
  const draws = [
    { id: "chart-donut",     fn: drawDonut,        done: false },
    { id: "chart-grouped",   fn: drawGroupedBar,   done: false },
    { id: "chart-stacked",   fn: drawStackedBar,   done: false },
    { id: "chart-detection", fn: drawDetectionBar, done: false },
    { id: "chart-rates",     fn: drawRateChart,    done: false },
    { id: "chart-heatmap",   fn: drawHeatmap,      done: false },
  ];

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const item = draws.find(d => d.id === entry.target.id);
      if (item && !item.done) {
        item.done = true;
        item.fn();
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  draws.forEach(d => {
    const el = document.getElementById(d.id);
    if (el) obs.observe(el);
  });
}

document.addEventListener("DOMContentLoaded", observeCharts);
