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
// 1. WAFFLE CHART — Fines by Age Group
// ============================================================
async function drawWaffle() {
  const raw = await d3.csv("data/fines_by_age_group.csv", d => ({
    age: d["AGE_GROUP"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  // Re-group minority ages: 0-16 is tiny. We will show them all but calculate squares based on proportion.
  const totalFines = d3.sum(raw, d => d.fines);
  
  // Waffle parameters: 10x10 grid = 100 squares total
  const cols = 20; 
  const rows = 10;
  const totalSquares = cols * rows;
  
  // Calculate squares per category using Largest Remainder Method to ensure exact total
  let waffleData = [];
  let remainingDecimals = [];
  let currentSquares = 0;

  raw.forEach((d, i) => {
    let exact = (d.fines / totalFines) * totalSquares;
    let intSqs = Math.floor(exact);
    let remainder = exact - intSqs;
    waffleData.push({ ...d, intSqs, finalSqs: intSqs, color: PALETTE.ageGroups[i] });
    currentSquares += intSqs;
    remainingDecimals.push({ index: i, remainder });
  });

  // Distribute remaining squares to categories with largest remainders
  remainingDecimals.sort((a,b) => b.remainder - a.remainder);
  for(let i=0; i < (totalSquares - currentSquares); i++) {
    waffleData[remainingDecimals[i].index].finalSqs += 1;
  }

  // Create an array mapping each 1 of the 200 squares to a category
  let squareArray = [];
  waffleData.forEach(d => {
    for(let k=0; k < d.finalSqs; k++){
      squareArray.push({ age: d.age, fines: d.fines, color: d.color, share: d.finalSqs / totalSquares });
    }
  });

  const container = document.getElementById("chart-waffle");
  const W = container.offsetWidth || 500;
  const H = 250;
  const padding = 2;
  const cellSize = Math.min((W - 120) / cols, H / rows) - padding;

  const svg = d3.select("#chart-waffle")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`)
    .attr("aria-label","Waffle chart showing fines by age group");

  const g = svg.append("g").attr("transform",`translate(10, 10)`);

  // Draw squares
  g.selectAll("rect")
    .data(squareArray)
    .enter()
    .append("rect")
    .attr("class", "waffle-cell")
    .attr("x", (d,i) => (i % cols) * (cellSize + padding))
    .attr("y", (d,i) => Math.floor(i / cols) * (cellSize + padding))
    .attr("width", cellSize)
    .attr("height", cellSize)
    .attr("fill", d => d.color)
    .attr("opacity", 0)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke", "#fff").attr("stroke-width", 2);
      showTip(`<strong>${d.age}</strong><br>${d3.format(",")(d.fines)} fines<br>${(d.share*100).toFixed(1)}% of total`, event);
    })
    .on("mousemove", moveTip)
    .on("mouseout", function(event, d) {
      d3.select(this).attr("stroke", "rgba(255,255,255,0.2)").attr("stroke-width", 1);
      hideTip();
    })
    .transition().duration(500).delay((d,i) => i * 4)
    .attr("opacity", 1);

  // Legend
  const legend = svg.append("g").attr("transform",`translate(${(cols * (cellSize + padding)) + 25}, 20)`);
  waffleData.forEach((d,i) => {
    const row = legend.append("g").attr("transform",`translate(0,${i*28})`);
    row.append("rect").attr("width",14).attr("height",14).attr("rx",3).attr("fill", d.color);
    row.append("text").attr("x",22).attr("y",12)
      .style("font-size","0.85rem").style("fill","#18222d")
      .text(d.age);
  });
}


// ============================================================
// 2. TWO BAR CHARTS — Arrests & Charges by Age Group
// ============================================================
async function drawArrestChargeBars() {
  const raw = await d3.csv("data/grouped_charges_and_arrest_by_age_group.csv", d => ({
    age:     d["AGE_GROUP"].trim(),
    arrests: +d["Sum(ARRESTS)"],
    charges: +d["Sum(CHARGES)"],
  }));

  function renderBar(containerId, dataKey, color, labelText) {
    const container = document.getElementById(containerId);
    if(!container) return;
    const W = container.offsetWidth || 240;
    const H = 250;
    const margin = {top: 20, right: 10, bottom: 40, left: 45};
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`)
      .append("svg").attr("viewBox", `0 0 ${W} ${H}`);

    const x = d3.scaleBand().domain(AGE_GROUPS).range([0, iw]).padding(0.2);
    const yMax = d3.max(raw, d => d[dataKey]);
    const y = d3.scaleLinear().domain([0, yMax * 1.15]).range([ih, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Gridlines & Axes
    g.append("g").attr("class","grid").call(d3.axisLeft(y).tickSize(-iw).tickFormat(""))
      .selectAll("line").style("stroke","rgba(0,0,0,0.07)");
    g.select(".grid .domain").remove();
    g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0))
      .selectAll("text")
      .style("font-size", "0.65rem")
      .attr("transform", "rotate(-20)").style("text-anchor", "end");
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")))
      .select(".domain").style("stroke","rgba(0,0,0,0.15)");

    const MIN_BAR = 3;

    g.selectAll(".bar")
      .data(raw).enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.age))
      .attr("y", ih)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", color)
      .attr("rx", 3)
      .on("mouseover", (e,d) => showTip(`<strong>${d.age}</strong><br>${labelText}: <strong>${d[dataKey]}</strong>`, e))
      .on("mousemove", moveTip)
      .on("mouseout", hideTip)
      .transition().duration(800).delay((_,i) => i * 80)
      .attr("y", d => d[dataKey] > 0 ? Math.min(y(d[dataKey]), ih - MIN_BAR) : ih)
      .attr("height", d => d[dataKey] > 0 ? Math.max(ih - y(d[dataKey]), MIN_BAR) : 0);

      // Value annotations
      g.selectAll(".lbl")
      .data(raw).enter().append("text")
      .attr("class", "lbl")
      .attr("text-anchor", "middle")
      .attr("x", d => x(d.age) + x.bandwidth() / 2)
      .attr("y", ih)
      .style("font-size", "0.7rem")
      .style("font-weight", "600")
      .style("fill", color)
      .text(d => d[dataKey] > 0 ? d[dataKey] : "0")
      .transition().duration(800).delay((_,i) => i * 80 + 200)
      .attr("y", d => {
        const top = d[dataKey] > 0 ? Math.min(y(d[dataKey]), ih - MIN_BAR) : ih;
        return top - 4;
      });
  }

  renderBar("chart-arrests", "arrests", PALETTE.arrest, "Arrests");
  renderBar("chart-charges", "charges", PALETTE.charges, "Charges");
}

// ============================================================
// 3. EIGHT PIE CHARTS — Fines by Jurisdiction & Age Group
// ============================================================
async function drawStatePies() {
  const raw = await d3.csv("data/grouped_fine_by_jurisdiction_and_age.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    age: d["AGE_GROUP"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  const filtered = raw.filter(d => d.age !== "All ages");
  const byJur = d3.group(filtered, d => d.jurisdiction);
  
  const container = document.getElementById("chart-pies-matrix");
  if(!container) return;
  // Clear any existing content
  container.innerHTML = "";

  const pie = d3.pie().value(d => d.fines).sort(null);

  JURISDICTIONS.forEach(state => {
    let data = byJur.get(state) || [];
    const total = d3.sum(data, d => d.fines);
    
    // Create a wrapper div for each pie
    const wrap = document.createElement("div");
    wrap.style.textAlign = "center";
    container.appendChild(wrap);

    const W = 140, H = 160;
    const R = Math.min(W, 140) / 2 - 10;
    const arc = d3.arc().innerRadius(R * 0.45).outerRadius(R);

    const svg = d3.select(wrap).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${W/2},${H/2 - 10})`);

    if(total > 0) {
      g.selectAll("path")
        .data(pie(data)).enter().append("path")
        .attr("d", arc)
        .attr("fill", d => PALETTE.ageGroups[AGE_GROUPS.indexOf(d.data.age)])
        .attr("stroke", "#fff").attr("stroke-width", 1)
        .on("mouseover", (e,d) => showTip(`<strong>${state} - ${d.data.age}</strong><br>Fines: ${d3.format(",")(d.data.fines)}<br>${((d.data.fines/total)*100).toFixed(1)}%`, e))
        .on("mousemove", moveTip).on("mouseout", hideTip);
    } else {
      g.append("circle").attr("r", R).attr("fill", "#eaeaea");
      g.append("text").attr("text-anchor", "middle").style("font-size", "0.7rem").attr("dy","0.3em").text("No Data");
    }

    // Centered state label
    g.append("text").attr("text-anchor", "middle").attr("dy", "0.3em")
      .style("font-weight", "700").style("font-size", "0.8rem")
      .style("fill", "#062654")
      .text(state);
      
    // Total label below
    svg.append("text").attr("x", W/2).attr("y", H - 5)
      .attr("text-anchor", "middle").style("font-size", "0.65rem").style("fill", "#44627a")
      .text("Total: " + d3.format(".2s")(total));
  });
}

// ============================================================
// 4. GROUPED BAR — Detection Method by Jurisdiction (SORTED)
// ============================================================
async function drawDetectionBar() {
  const raw = await d3.csv("data/grouped_fine_by_jurisdiction_and_detection.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    method: d["DETECTION_METHOD"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  const byJur = d3.group(raw, d => d.jurisdiction);
  const pivoted = [];
  byJur.forEach((rows, j) => {
    const obj = { jurisdiction: j };
    rows.forEach(r => { obj[r.method] = r.fines; });
    obj["Camera issued"] = obj["Camera issued"] || 0;
    obj["Police issued"] = obj["Police issued"] || 0;
    obj.total = obj["Camera issued"] + obj["Police issued"];
    pivoted.push(obj);
  });
  
  // Sort jurisdictions by TOTAL fines descending
  pivoted.sort((a,b) => b.total - a.total);

  const jurs    = pivoted.map(d => d.jurisdiction);
  const methods = ["Camera issued", "Police issued"];
  const colors  = { "Camera issued": PALETTE.camera, "Police issued": PALETTE.police };

  const container = document.getElementById("chart-detection");
  container.innerHTML = "";
  
  const W = container.offsetWidth || 520;
  const H = 330;
  const margin = {top:24, right:24, bottom:54, left:72};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top  - margin.bottom;

  const svg = d3.select("#chart-detection")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`);

  const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand().domain(jurs).range([0,iw]).padding(0.28);
  const x1 = d3.scaleBand().domain(methods).rangeRound([0, x0.bandwidth()]).padding(0.06);

  const yMax = d3.max(pivoted, d => Math.max(d["Camera issued"], d["Police issued"]));
  const y = d3.scaleLog().domain([1, yMax * 1.5]).range([ih, 0]).clamp(true);

  // gridlines & axes
  g.append("g").attr("class","grid").call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""))
    .selectAll("line").style("stroke","rgba(0,0,0,0.07)");
  g.select(".grid .domain").remove();
  
  g.append("g").attr("class","y-axis").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");
  g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x0).tickSize(0))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");

  const MIN_BAR = 3;

  methods.forEach(m => {
    g.selectAll(`.bar-det-${m.replace(/\s+/g,"-")}`)
      .data(pivoted).enter().append("rect")
      .attr("class", `bar-det bar-det-${m.replace(/\s+/g,"-")}`)
      .attr("x", d => x0(d.jurisdiction) + x1(m))
      .attr("y", ih)
      .attr("width", x1.bandwidth())
      .attr("height", 0)
      .attr("fill", colors[m])
      .attr("rx", 4)
      .on("mouseover",(e,d) => showTip(`<strong>${d.jurisdiction}</strong><br>${m}: <strong>${d3.format(",")(d[m])}</strong>`,e))
      .on("mousemove", moveTip).on("mouseout", hideTip)
      .transition().duration(700).delay((_,i) => i * 60)
      .attr("y", d => d[m] > 0 ? Math.min(y(Math.max(1, d[m])), ih - MIN_BAR) : ih)
      .attr("height", d => d[m] > 0 ? Math.max(ih - y(Math.max(1, d[m])), MIN_BAR) : 0);

      g.selectAll(`.lbl-det-${m.replace(/\s+/g,"-")}`)
      .data(pivoted).enter().append("text")
      .attr("text-anchor", "middle")
      .attr("x", d => x0(d.jurisdiction) + x1(m) + x1.bandwidth() / 2)
      .attr("y", ih)
      .style("font-size", "0.60rem").style("font-weight", "600").style("fill", colors[m])
      .text(d => d[m] > 0 ? d3.format(".2s")(d[m]) : "")
      .transition().duration(700).delay((_,i) => i * 60 + 250)
      .attr("y", d => {
        if (d[m] <= 0) return ih;
        return Math.min(y(Math.max(1, d[m])), ih - MIN_BAR) - 4;
      });
  });

  // legend
  const leg = svg.append("g").attr("transform",`translate(${margin.left},${H-10})`);
  methods.forEach((m,i) => {
    const lx = i * 155;
    leg.append("rect").attr("x",lx).attr("y",-10).attr("width",12).attr("height",12).attr("rx",3).attr("fill",colors[m]);
    leg.append("text").attr("x",lx+16).attr("y",0).style("font-size","0.78rem").style("fill","#18222d").text(m);
  });
  
  svg.append("text").attr("x", margin.left).attr("y", 10).style("font-size", "0.65rem").style("fill", "#666").text("Note: Logarithmic Scale Applied to show structural differences.");
}


// ============================================================
// 5. CHOROPLETH MAP — Enforcement Rates
// ============================================================
async function drawChoropleth() {
  const container = document.getElementById("chart-choropleth");
  if(!container) return;
  
  const raw = await d3.csv("data/charges_and_arrest_rate_by_jurisdiction.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    arrest:  +d["Arrest_Rate"],
    charges: +d["Charges_rate"],
  }));
  
  const ratesMap = new Map(raw.map(d => [d.jurisdiction, d.charges])); // Visualize charge rates
  const maxRate = d3.max(raw, d => d.charges);
  // Using oranges for charges
  const colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, maxRate * 1.2]);

  let geoData;
  try {
    geoData = await d3.json("data/states.geojson");
  } catch(e) {
    console.error("Map load error:", e);
    container.innerHTML = "<p><em>Map cannot be loaded. Could not read data/states.geojson.</em></p>";
    return;
  }

  const W = container.offsetWidth || 350;
  const H = 280;
  
  const svg = d3.select("#chart-choropleth")
    .append("svg").attr("viewBox", `0 0 ${W} ${H}`);

  const projection = d3.geoMercator().fitSize([W, H], geoData);
  const path = d3.geoPath().projection(projection);

  // Abbreviations mapper: data uses short codes, geojson has full names or codes in PROPERTIES
  const stateCodeMap = {
    "Australian Capital Territory": "ACT",
    "New South Wales": "NSW",
    "Northern Territory": "NT",
    "Queensland": "QLD",
    "South Australia": "SA",
    "Tasmania": "TAS",
    "Victoria": "VIC",
    "Western Australia": "WA"
  };

  svg.append("g")
    .selectAll("path")
    .data(geoData.features)
    .enter().append("path")
    .attr("class", "map-feature")
    .attr("d", path)
    .attr("fill", d => {
      const stateName = d.properties.STATE_NAME;
      const code = stateCodeMap[stateName] || stateName;
      const rate = ratesMap.get(code) || 0;
      return colorScale(rate);
    })
    .on("mouseover", (e, d) => {
      const stateName = d.properties.STATE_NAME;
      const code = stateCodeMap[stateName] || stateName;
      const chargeRate = ratesMap.get(code) || 0;
      const arrRate = raw.find(r => r.jurisdiction === code)?.arrest || 0;
      showTip(`<strong>${stateName} (${code})</strong><br>Charge Rate: <strong>${chargeRate}%</strong><br>Arrest Rate: <strong>${arrRate}%</strong>`, e);
    })
    .on("mousemove", moveTip).on("mouseout", hideTip);

  // Simple Legend
  const leg = svg.append("g").attr("transform", `translate(10, ${H-30})`);
  const defs = svg.append("defs");
  const lgId = "choro-grad";
  const grad = defs.append("linearGradient").attr("id", lgId);
  grad.append("stop").attr("offset","0%").attr("stop-color", colorScale(0));
  grad.append("stop").attr("offset","100%").attr("stop-color", colorScale(maxRate));
  
  leg.append("rect").attr("width", 100).attr("height", 8).attr("rx", 4).attr("fill", `url(#${lgId})`);
  leg.append("text").attr("x", 0).attr("y", -5).style("font-size", "0.6rem").text("0%");
  leg.append("text").attr("x", 100).attr("y", -5).attr("text-anchor", "end").style("font-size", "0.6rem").text(`${maxRate}%`);
}

// ============================================================
// 6. HEATMAP — Fines per Jurisdiction × Age
// ============================================================
async function drawHeatmap() {
  const raw = await d3.csv("data/grouped_fine_by_jurisdiction_and_age.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    age:   d["AGE_GROUP"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  const filtered = raw.filter(d => d.age !== "All ages" && d.fines > 0);

  const container = document.getElementById("chart-heatmap");
  if(!container) return;
  const W = container.offsetWidth || 520;
  const H = 280;
  const margin = {top:12, right:20, bottom:60, left:52};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top  - margin.bottom;

  const svg = d3.select("#chart-heatmap")
    .append("svg").attr("viewBox",`0 0 ${W} ${H}`);

  const g = svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(JURISDICTIONS).range([0,iw]).padding(0.06);
  const y = d3.scaleBand().domain(AGE_GROUPS).range([0,ih]).padding(0.06);
  const maxVal = d3.max(filtered, d => d.fines);
  const color  = d3.scaleSequential(d3.interpolateBlues).domain([0, maxVal]);

  g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
  g.append("g").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();

  g.selectAll("rect.cell")
    .data(filtered).enter().append("rect")
    .attr("class","cell")
    .attr("x", d => x(d.jurisdiction)).attr("y", d => y(d.age))
    .attr("width",  x.bandwidth()).attr("height", y.bandwidth())
    .attr("rx", 4).attr("fill","rgba(255,255,255,0)")
    .on("mouseover",(e,d) => showTip(`<strong>${d.jurisdiction}</strong> — ${d.age}<br>Fines: <strong>${d3.format(",")(d.fines)}</strong>`,e))
    .on("mousemove", moveTip).on("mouseout", hideTip)
    .transition().duration(800).delay((_,i) => i*20)
    .attr("fill", d => color(d.fines));
}

// ============================================================
// 7. RADAR CHART — Percentage of Fines by Jurisdiction
// ============================================================
async function drawRadarChart() {
  const raw = await d3.csv("data/grouped_fine_by_jurisdiction_and_age.csv", d => ({
    jurisdiction: d["JURISDICTION"].trim(),
    age: d["AGE_GROUP"].trim(),
    fines: +d["Sum(FINES)"],
  }));

  const allAges = raw.filter(d => d.age === "All ages");
  const totalNation = d3.sum(allAges, d => d.fines);
  
  let radarData = allAges.map(d => ({
    axis: d.jurisdiction,
    value: d.fines / totalNation
  }));

  const container = document.getElementById("chart-radar");
  if(!container) return;
  const W = container.offsetWidth || 500;
  const H = 400;
  const margin = 50;
  const radius = Math.min(W/2, H/2) - margin;

  const svg = d3.select("#chart-radar")
    .append("svg").attr("viewBox", `0 0 ${W} ${H}`);

  const g = svg.append("g").attr("transform", `translate(${W/2},${H/2})`);

  const numAxes = JURISDICTIONS.length;
  const angleSlice = (Math.PI * 2) / numAxes;
  const maxVal = d3.max(radarData, d => d.value) * 1.1; // adding some headroom
  
  // Use scaleSqrt to inflate small states
  const rScale = d3.scaleSqrt().range([0, radius]).domain([0, maxVal]);

  // Background Webs
  const ticks = [0.05, 0.15, 0.30, 0.45];
  ticks.forEach(t => {
    if (t > maxVal) return;
    const r = rScale(t);
    g.append("circle")
      .attr("class", "radar-web")
      .attr("r", r);
      
    g.append("text")
      .attr("x", 4).attr("y", -r + 12)
      .style("font-size", "0.6rem").style("fill", "#666")
      .text(`${(t * 100).toFixed(0)}%`);
  });

  // Axes lines
  const axes = g.selectAll(".axis").data(JURISDICTIONS).enter().append("g").attr("class", "axis");
  axes.append("line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", (d, i) => rScale(maxVal * 1.05) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y2", (d, i) => rScale(maxVal * 1.05) * Math.sin(angleSlice * i - Math.PI / 2))
    .attr("class", "radar-axis");

  axes.append("text")
    .attr("text-anchor", "middle")
    .attr("x", (d, i) => rScale(maxVal * 1.25) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y", (d, i) => rScale(maxVal * 1.25) * Math.sin(angleSlice * i - Math.PI / 2))
    .style("font-weight", "600").style("font-size", "0.75rem").style("fill", "#062654")
    .text(d => d);

  // Build polygon
  const radarLine = d3.lineRadial()
    .angle((d,i) => i * angleSlice)
    .radius(d => rScale(d.value))
    .curve(d3.curveLinearClosed);

  g.append("path")
    .datum(radarData)
    .attr("class", "radar-area")
    .attr("d", radarLine)
    .style("opacity", 0)
    .transition().duration(1200)
    .style("opacity", 0.7);

  // Data points
  g.selectAll(".radar-point")
    .data(radarData)
    .enter().append("circle")
    .attr("class", "radar-point")
    .attr("r", 4)
    .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
    .on("mouseover", (e,d) => showTip(`<strong>${d.axis}</strong><br>Nationwide Share: <strong>${(d.value * 100).toFixed(2)}%</strong>`, e))
    .on("mousemove", moveTip).on("mouseout", hideTip);
}

// ============================================================
// Intersection-observer: animate when chart enters viewport
// ============================================================
function observeCharts() {
  const draws = [
    { id: "chart-waffle",       fn: drawWaffle,           done: false },
    { id: "chart-arrests",      fn: drawArrestChargeBars, done: false },
    { id: "chart-pies-matrix",  fn: drawStatePies,        done: false },
    { id: "chart-detection",    fn: drawDetectionBar,     done: false },
    { id: "chart-choropleth",   fn: drawChoropleth,       done: false },
    { id: "chart-heatmap",      fn: drawHeatmap,          done: false },
    { id: "chart-radar",        fn: drawRadarChart,       done: false }
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
