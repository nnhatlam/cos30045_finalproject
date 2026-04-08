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
// GLOBAL STATE MANAGER (Cross-Filtering)
// ============================================================
const appState = {
  activeJurisdiction: null,
  listeners: []
};

const setGlobalFilter = (jurisdiction) => {
  // Toggle off if clicking same, otherwise set new
  appState.activeJurisdiction = appState.activeJurisdiction === jurisdiction ? null : jurisdiction;
  appState.listeners.forEach(fn => fn(appState.activeJurisdiction));
};

const subscribeToFilter = (fn) => {
  appState.listeners.push(fn);
};


// ============================================================
// 1. WAFFLE CHART — Mobile phone use offences Group
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

  // Cross-Filter Subscription
  subscribeToFilter(activeFilter => {
    container.querySelectorAll('.state-pie-wrapper').forEach(wrapper => {
      if (activeFilter && wrapper.dataset.state !== activeFilter) {
        wrapper.style.opacity = "0.15";
      } else {
        wrapper.style.opacity = "1";
      }
    });
  });

  // Render Legend
  const legendContainer = document.getElementById("chart-pies-legend");
  if(legendContainer) {
    legendContainer.innerHTML = "";
    AGE_GROUPS.forEach((age, i) => {
      const item = document.createElement("div");
      item.style.cssText = "display:flex; align-items:center; gap:0.4rem; font-size:0.8rem; color:#18222d;";
      
      const box = document.createElement("div");
      box.style.cssText = `width:12px; height:12px; border-radius:3px; background-color:${PALETTE.ageGroups[i]};`;

      const text = document.createElement("span");
      text.textContent = age;

      item.appendChild(box);
      item.appendChild(text);
      legendContainer.appendChild(item);
    });
  }
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

  let useLog = true;
  const btnLog = document.getElementById("btn-scale-log");
  const btnLin = document.getElementById("btn-scale-lin");

  // Insight Calculations
  const calcRatios = pivoted.map(d => {
    const cam = d["Camera issued"] || 0;
    const pol = d["Police issued"] || 0;
    const total = cam + pol;
    return {
      state: d.jurisdiction,
      ratio: total > 0 ? (cam / total) * 100 : 0
    };
  }).sort((a,b) => b.ratio - a.ratio);
  
  const topState = calcRatios[0];
  const lowState = calcRatios[calcRatios.length - 1]; // usually NT
  
  const insightTextObj = document.getElementById("insight-camera-ratio");
  if (insightTextObj) {
    insightTextObj.innerHTML = `<strong>Data Processing Output:</strong> <strong>${topState.state}</strong> leads automated enforcement (<strong>${topState.ratio.toFixed(1)}%</strong> of fines via camera). Conversely, <strong>${lowState.state}</strong> relies least on automation (<strong>${lowState.ratio.toFixed(1)}%</strong>), highlighting a massive structural inequality in how safety policy is enforced physically vs digitally.`;
  }

  function drawScaleElements() {
    const yMaxL = d3.max(pivoted, d => Math.max(d["Camera issued"], d["Police issued"]));
    const yScale = useLog 
      ? d3.scaleLog().domain([1, yMaxL * 1.5]).range([ih, 0]).clamp(true)
      : d3.scaleLinear().domain([0, yMaxL * 1.15]).range([ih, 0]);

    // gridlines & axes
    g.selectAll(".grid").remove();
    g.selectAll(".y-axis").remove();
    
    g.append("g").attr("class","grid").call(d3.axisLeft(yScale).ticks(5).tickSize(-iw).tickFormat(""))
      .selectAll("line").style("stroke","rgba(0,0,0,0.07)");
    g.select(".grid .domain").remove();
    
    g.append("g").attr("class","y-axis").call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format("~s")))
      .select(".domain").style("stroke","rgba(0,0,0,0.15)");
      
    return yScale;
  }

  let y = drawScaleElements();
  g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x0).tickSize(0))
    .select(".domain").style("stroke","rgba(0,0,0,0.15)");

  const MIN_BAR = 3;

  const getBarY = (val, yScl) => {
    if (val <= 0) return ih;
    return useLog ? Math.min(yScl(Math.max(1, val)), ih - MIN_BAR) : Math.min(yScl(val), ih - MIN_BAR);
  };

  const getBarH = (val, yScl) => {
    if (val <= 0) return 0;
    return useLog ? Math.max(ih - yScl(Math.max(1, val)), MIN_BAR) : Math.max(ih - yScl(val), MIN_BAR);
  };

  methods.forEach(m => {
    // Bars
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
      .attr("y", d => getBarY(d[m], y))
      .attr("height", d => getBarH(d[m], y));

    // Labels
    g.selectAll(`.lbl-det-${m.replace(/\s+/g,"-")}`)
      .data(pivoted).enter().append("text")
      .attr("class", `lbl-det lbl-det-${m.replace(/\s+/g,"-")}`)
      .attr("text-anchor", "middle")
      .attr("x", d => x0(d.jurisdiction) + x1(m) + x1.bandwidth() / 2)
      .attr("y", ih)
      .style("font-size", "0.60rem").style("font-weight", "600").style("fill", colors[m])
      .text(d => d[m] > 0 ? d3.format(".2s")(d[m]) : "")
      .transition().duration(700).delay((_,i) => i * 60 + 250)
      .attr("y", d => d[m] <= 0 ? ih : getBarY(d[m], y) - 4);
  });

  // Scale Toggle Events
  if (btnLog && btnLin) {
    const updateScale = (isLog) => {
      useLog = isLog;
      btnLog.classList.toggle("active", isLog);
      btnLin.classList.toggle("active", !isLog);
      
      const newY = drawScaleElements();
      methods.forEach(m => {
        g.selectAll(`.bar-det-${m.replace(/\s+/g,"-")}`)
          .transition().duration(600)
          .attr("y", d => getBarY(d[m], newY))
          .attr("height", d => getBarH(d[m], newY));

        g.selectAll(`.lbl-det-${m.replace(/\s+/g,"-")}`)
          .transition().duration(600)
          .attr("y", d => d[m] <= 0 ? ih : getBarY(d[m], newY) - 4);
      });
    };
    btnLog.addEventListener("click", () => updateScale(true));
    btnLin.addEventListener("click", () => updateScale(false));
  }

  // CROSS-FILTER SUBSCRIBER
  subscribeToFilter((activeFilter) => {
    g.selectAll(".bar-det").style("opacity", d => (activeFilter && d.jurisdiction !== activeFilter) ? 0.15 : 1);
    g.selectAll(".lbl-det").style("opacity", d => (activeFilter && d.jurisdiction !== activeFilter) ? 0.15 : 1);
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
  
  let fillMetric = "charges"; // Default metric
  
  const ratesMapCharge = new Map(raw.map(d => [d.jurisdiction, d.charges]));
  const ratesMapArrest = new Map(raw.map(d => [d.jurisdiction, d.arrest]));
  
  const maxCharge = d3.max(raw, d => d.charges);
  const maxArrest = d3.max(raw, d => d.arrest);
  
  // Color scales for both modes
  const colorScaleCharge = d3.scaleSequential(d3.interpolateOranges).domain([0, maxCharge * 1.2]);
  const colorScaleArrest = d3.scaleSequential(d3.interpolateBlues).domain([0, maxArrest * 1.2]);

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

  const getRateAndColor = (code) => {
    if (fillMetric === "charges") return { rate: ratesMapCharge.get(code) || 0, color: colorScaleCharge };
    return { rate: ratesMapArrest.get(code) || 0, color: colorScaleArrest };
  }

  const mapPaths = svg.append("g")
    .selectAll("path")
    .data(geoData.features)
    .enter().append("path")
    .attr("class", "map-feature")
    .attr("d", path)
    .attr("fill", d => {
      const stateName = d.properties.STATE_NAME;
      const code = stateCodeMap[stateName] || stateName;
      return getRateAndColor(code).color(getRateAndColor(code).rate);
    });

  mapPaths.on("mouseover", (e, d) => {
    const stateName = d.properties.STATE_NAME;
    const code = stateCodeMap[stateName] || stateName;
    const chargeRate = ratesMapCharge.get(code) || 0;
    const arrRate = ratesMapArrest.get(code) || 0;
    
    // Highlight hovered metric
    const chargeHTML = fillMetric === "charges" ? `<u>Charge Rate: <strong>${chargeRate}%</strong></u>` : `Charge Rate: <strong>${chargeRate}%</strong>`;
    const arrHTML = fillMetric === "arrest" ? `<u>Arrest Rate: <strong>${arrRate}%</strong></u>` : `Arrest Rate: <strong>${arrRate}%</strong>`;
    
    showTip(`<strong>${stateName} (${code})</strong><br>${chargeHTML}<br>${arrHTML}<br><br><em>Click to cross-filter</em>`, e);
  }).on("mousemove", moveTip).on("mouseout", hideTip)
  .on("click", (e, d) => {
    const code = stateCodeMap[d.properties.STATE_NAME] || d.properties.STATE_NAME;
    setGlobalFilter(code); // Trigger cross-filter
  }).style("cursor", "pointer");

  // Subscribe Map to Filter
  subscribeToFilter(activeFilter => {
    mapPaths.transition().duration(300)
      .style("opacity", d => {
        const code = stateCodeMap[d.properties.STATE_NAME] || d.properties.STATE_NAME;
        return (activeFilter && code !== activeFilter) ? 0.2 : 1;
      })
      .style("stroke", d => {
        const code = stateCodeMap[d.properties.STATE_NAME] || d.properties.STATE_NAME;
        return (activeFilter && code === activeFilter) ? "#1f2937" : "none";
      })
      .style("stroke-width", d => {
        const code = stateCodeMap[d.properties.STATE_NAME] || d.properties.STATE_NAME;
        return (activeFilter && code === activeFilter) ? "2px" : "0px";
      });
  });

  // Dynamic Legend
  const leg = svg.append("g").attr("transform", `translate(10, ${H-30})`);
  const defs = svg.append("defs");
  
  const gradCharge = defs.append("linearGradient").attr("id", "choro-grad-charge");
  gradCharge.append("stop").attr("offset","0%").attr("stop-color", colorScaleCharge(0));
  gradCharge.append("stop").attr("offset","100%").attr("stop-color", colorScaleCharge(maxCharge));
  
  const gradArrest = defs.append("linearGradient").attr("id", "choro-grad-arrest");
  gradArrest.append("stop").attr("offset","0%").attr("stop-color", colorScaleArrest(0));
  gradArrest.append("stop").attr("offset","100%").attr("stop-color", colorScaleArrest(maxArrest));
  
  const legendRect = leg.append("rect").attr("width", 140).attr("height", 8).attr("rx", 4).attr("fill", `url(#choro-grad-charge)`);
  
  const legendMin = leg.append("text").attr("x", 0).attr("y", -5).style("font-size", "0.6rem").text("0% (Charge Rate)");
  const legendMax = leg.append("text").attr("x", 140).attr("y", -5).attr("text-anchor", "end").style("font-size", "0.6rem").text(`${maxCharge}%`);

  // Interactions
  const btnCharge = document.getElementById("btn-map-charge");
  const btnArrest = document.getElementById("btn-map-arrest");
  
  if (btnCharge && btnArrest) {
    const swapMapMode = (isCharge) => {
      if ((isCharge && fillMetric === "charges") || (!isCharge && fillMetric === "arrest")) return;
      fillMetric = isCharge ? "charges" : "arrest";
      
      btnCharge.classList.toggle("active", isCharge);
      btnArrest.classList.toggle("active", !isCharge);
      
      // Animate map color
      mapPaths.transition().duration(600).attr("fill", d => {
        const stateName = d.properties.STATE_NAME;
        const code = stateCodeMap[stateName] || stateName;
        return getRateAndColor(code).color(getRateAndColor(code).rate);
      });
      
      // Update Legend
      legendRect.attr("fill", isCharge ? `url(#choro-grad-charge)` : `url(#choro-grad-arrest)`);
      legendMin.text(`0% (${isCharge ? 'Charge Rate' : 'Arrest Rate'})`);
      legendMax.text(`${isCharge ? maxCharge : maxArrest}%`);
    };
    
    btnCharge.addEventListener("click", () => swapMapMode(true));
    btnArrest.addEventListener("click", () => swapMapMode(false));
  }
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
    .style("cursor", "pointer")
    .on("click", (e,d) => setGlobalFilter(d.jurisdiction))
    .on("mouseover", function(e,d) {
       d3.select(this).style("stroke", "#fff").style("stroke-width", "2");
       showTip(`<strong>${d.jurisdiction}</strong> — ${d.age}<br>Fines: <strong>${d3.format(",")(d.fines)}</strong>`,e);
    })
    .on("mousemove", moveTip).on("mouseout", function() {
       d3.select(this).style("stroke", "none");
       hideTip();
    })
    .transition().duration(800).delay((_,i) => i*20)
    .attr("fill", d => color(d.fines));
    
  // Subscribing to filter
  subscribeToFilter(tf => {
     g.selectAll("rect.cell").transition().duration(300)
       .style("opacity", d => (tf && d.jurisdiction !== tf) ? 0.15 : 1);
  });
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
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", (d, i) => rScale(maxVal * 1.25) * Math.cos(angleSlice * i - Math.PI / 2))
    .attr("y", (d, i) => rScale(maxVal * 1.25) * Math.sin(angleSlice * i - Math.PI / 2))
    .style("font-weight", "600").style("font-size", "0.75rem").style("fill", "#062654")
    .text(d => d)
    .on("click", (e, d) => {
      // Find the data point for this state
      const targetPoint = radarData.find(x => x.axis === d);
      if (!targetPoint) return;
      
      setGlobalFilter(d);
             
      showTip(`<strong>Isolated Footprint</strong><br>${d} handles <strong>${(targetPoint.value * 100).toFixed(2)}%</strong> of national volume.`, e);
      setTimeout(hideTip, 2500);
    });

  // Subscribe Radar to Filter
  subscribeToFilter(activeFilter => {
    // Dim Unselected Web Points
    g.selectAll(".radar-point").transition().duration(200)
      .attr("r", p => (activeFilter && p.axis === activeFilter) ? 8 : (activeFilter ? 2 : 4))
      .style("opacity", p => (activeFilter && p.axis !== activeFilter) ? 0.3 : 1)
      .style("fill", p => (activeFilter && p.axis === activeFilter) ? PALETTE.camera : "#fff");

    // Dim Background path slightly as well to focus on point
    pathGroup.transition().duration(200)
      .style("fill-opacity", activeFilter ? 0.1 : 0.4);
  });

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
// 7. ROAD CRASH - DUMBBELL PLOT
// ============================================================
async function drawCrashSlopegraph() {
  const container = document.getElementById("chart-crash-slope");
  if(!container) return;
  
  const raw = await d3.csv("data/rate_roadcrashbystate.csv");
  const data23 = raw.find(d => d["Calendar year"] === "2023");
  const data24 = raw.find(d => d["Calendar year"] === "2024");
  
  if(!data23 || !data24) return;

  const formatted = JURISDICTIONS.map(state => {
    return {
      state: state,
      v23: +(data23[state] || 0),
      v24: +(data24[state] || 0)
    };
  });
  
  const W = container.offsetWidth || 500;
  const H = 340;
  const margin = {top:30, right:30, bottom:40, left:60};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top - margin.bottom;
  
  const svg = d3.select("#chart-crash-slope").append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
  
  const y = d3.scaleBand().domain(formatted.map(d=>d.state)).range([0, ih]).padding(1);
  const maxV = d3.max(formatted, d => Math.max(d.v23, d.v24));
  const x = d3.scaleLinear().domain([0, maxV * 1.1]).range([0, iw]);
  
  // Axes & Grid
  const xAxisGrid = d3.axisBottom(x).tickSize(-ih).ticks(5).tickFormat("");
  const gridG = g.append("g").attr("class", "x-grid").attr("transform", `translate(0,${ih})`);
  gridG.call(xAxisGrid).selectAll("line").style("stroke", "rgba(255,255,255,0.05)").style("stroke-dasharray", "3,3");
    
  const xAxisObj = d3.axisBottom(x).ticks(5);
  const xAxisG = g.append("g").attr("transform",`translate(0,${ih})`);
  xAxisG.call(xAxisObj).selectAll("text").style("fill", "#8e9eb0");
  g.append("g").call(d3.axisLeft(y).tickSize(0)).selectAll("text")
   .style("fill", "#c5d1de").style("font-size", "0.75rem").style("font-weight", "600");
  g.selectAll(".domain").style("stroke","rgba(255,255,255,0.2)");
  
  svg.append("defs").append("clipPath").attr("id", "clip-slope").append("rect").attr("width", iw).attr("height", ih + 10).attr("y", -5);
  const chartArea = g.append("g").attr("clip-path", "url(#clip-slope)");
  
  const dumbGrp = chartArea.selectAll(".dumbbell").data(formatted).enter().append("g")
    .style("cursor", "pointer")
    .on("click", (e,d) => setGlobalFilter(d.state))
    .on("mouseover", function(e, d) {
       d3.select(this).selectAll("line.db-bar").style("stroke-width", "6").style("filter", "brightness(1.5)");
       const change = ((d.v24 - d.v23)/d.v23 * 100).toFixed(1);
       showTip(`<strong>${d.state} Shift</strong><br>2023 Rate: ${d.v23}<br>2024 Rate: ${d.v24}<br>Delta: <span style="color:${d.v24 > d.v23 ? '#f43f5e' : '#10b981'}"><strong>${change > 0 ? '+'+change : change}%</strong></span>`, e);
    })
    .on("mousemove", moveTip).on("mouseout", function(e,d) {
       d3.select(this).selectAll("line.db-bar").style("stroke-width", "4").style("filter","none");
       hideTip();
    });

  // Connecting Bar
  dumbGrp.append("line").attr("class", "db-bar")
    .attr("x1", d => x(d.v23)).attr("x2", d => x(d.v24))
    .attr("y1", d => y(d.state)).attr("y2", d => y(d.state))
    .style("stroke", d => d.v24 > d.v23 ? "#f43f5e" : "#10b981")
    .style("stroke-width", "4");
    
  // 2023 Dot
  dumbGrp.append("circle").attr("class", "dot-23").attr("cx", d=>x(d.v23)).attr("cy", d=>y(d.state)).attr("r", 5).style("fill", "#cbd5e1");
  // 2024 Dot
  dumbGrp.append("circle").attr("class", "dot-24").attr("cx", d=>x(d.v24)).attr("cy", d=>y(d.state)).attr("r", 7).style("fill", d => d.v24 > d.v23 ? "#f43f5e" : "#10b981")
         .style("stroke", "#1a2333").style("stroke-width", "2");

  // Zoom & Drag behavior
  const zoom = d3.zoom().scaleExtent([0.5, 5]).extent([[0, 0], [iw, ih]]).on("zoom", (event) => {
    const newX = event.transform.rescaleX(x);
    xAxisG.call(xAxisObj.scale(newX)).selectAll("text").style("fill", "#8e9eb0");
    gridG.call(xAxisGrid.scale(newX)).selectAll("line").style("stroke", "rgba(255,255,255,0.05)").style("stroke-dasharray", "3,3");
    dumbGrp.selectAll(".db-bar").attr("x1", d => newX(d.v23)).attr("x2", d => newX(d.v24));
    dumbGrp.selectAll(".dot-23").attr("cx", d => newX(d.v23));
    dumbGrp.selectAll(".dot-24").attr("cx", d => newX(d.v24));
  });
  svg.call(zoom);

  // Legend
  svg.append("circle").attr("cx", 20).attr("cy", 20).attr("r", 4).style("fill", "#cbd5e1");
  svg.append("text").attr("x", 30).attr("y", 24).style("font-size", "0.7rem").style("fill", "#cbd5e1").text("2023 Base");
  svg.append("circle").attr("cx", 100).attr("cy", 20).attr("r", 4).style("fill", "#10b981");
  svg.append("text").attr("x", 110).attr("y", 24).style("font-size", "0.7rem").style("fill", "#cbd5e1").text("2024 Improved");
  svg.append("circle").attr("cx", 200).attr("cy", 20).attr("r", 4).style("fill", "#f43f5e");
  svg.append("text").attr("x", 210).attr("y", 24).style("font-size", "0.7rem").style("fill", "#cbd5e1").text("2024 Worsened");

  subscribeToFilter(tf => {
     dumbGrp.style("opacity", d => (tf && d.state !== tf) ? 0.15 : 1);
  });
}

// ============================================================
// 8. NIGHTINGALE ROSE CHART (Polar Chart)
// ============================================================
async function drawCrashBarChart() {
  const container = document.getElementById("chart-crash-bar");
  if(!container) return;
  
  const raw = await d3.csv("data/roadcrash_count_by_age_group.csv");
  const keys = Object.keys(raw[0]);
  const ageKeys = keys.filter(k => k !== "Calendar year" && k.trim() !== "");
  
  const extractData = (yearStr) => {
    const r = raw.find(d => d["Calendar year"] === yearStr);
    return ageKeys.map(k => {
      let cleanAge = k.replace(/\n| /g, " ").replace(/\s+/g," ").trim();
      cleanAge = cleanAge.replace(/\s+to\s+/, "-");
      return { age: cleanAge, count: +(r[k] || 0) };
    });
  };
  
  let currentYear = "2024";
  let dataDisplay = extractData(currentYear);
  
  const W = container.offsetWidth || 500;
  const H = 340;
  const margin = 20;
  
  const svg = d3.select("#chart-crash-bar").append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  const radius = Math.min(W, H) / 2 - margin;
  const g = svg.append("g").attr("transform", `translate(${W/2}, ${H/2 + 10})`);
  
  const maxVal = d3.max(dataDisplay, d=>d.count) * 1.2;
  const x = d3.scaleBand().range([0, 2 * Math.PI]).domain(dataDisplay.map(d=>d.age));
  const y = d3.scaleLinear().range([30, radius]).domain([0, maxVal]); // 30 is inner hole
  
  const arcMaker = d3.arc()
    .innerRadius(30)
    .outerRadius(d => y(d.count))
    .startAngle(d => x(d.age))
    .endAngle(d => x(d.age) + x.bandwidth())
    .padAngle(0.05)
    .padRadius(30);

  const petals = g.selectAll("path.petal").data(dataDisplay).enter().append("path")
    .attr("class", "petal")
    .attr("fill", (d,i) => PALETTE.ageGroups[i % PALETTE.ageGroups.length])
    .attr("d", arcMaker)
    .style("opacity", 0.9)
    .style("cursor", "pointer")
    .on("mouseover", function(e,d) {
       d3.select(this).style("opacity", 1).style("stroke", "#fff");
       showTip(`<strong>Age ${d.age}</strong><br>Incidents: <strong>${d.count}</strong>`, e);
    })
    .on("mousemove", moveTip).on("mouseout", function() {
       d3.select(this).style("opacity", 0.9).style("stroke", "none");
       hideTip();
    });

  // Circular grid rings
  const ringVals = y.ticks(4).slice(1);
  const rings = g.selectAll(".ring").data(ringVals).enter().append("circle")
    .attr("r", d => y(d))
    .style("fill", "none").style("stroke", "rgba(255,255,255,0.1)").style("stroke-dasharray", "2,2");
    
  g.selectAll(".ring-lbl").data(ringVals).enter().append("text")
    .attr("y", d => -y(d)).attr("dy", "0.8em").attr("text-anchor", "middle")
    .style("fill", "rgba(255,255,255,0.4)").style("font-size", "0.6rem")
    .text(d => d);

  // Age group labels radially outward
  const lbls = g.selectAll(".petal-lbl").data(dataDisplay).enter().append("g")
    .attr("class", "petal-lbl")
    .attr("text-anchor", d => {
        const a = (x(d.age) + x.bandwidth()/2) * 180 / Math.PI - 90;
        return (a > 90 && a < 270) ? "end" : "start";
    })
    .attr("transform", d => {
        const a = (x(d.age) + x.bandwidth()/2) * 180 / Math.PI - 90;
        const r = y(d.count) + 10;
        return `rotate(${a}) translate(${r},0) ${a > 90 && a < 270 ? "rotate(180)" : ""}`;
    });
    
  lbls.append("text")
    .style("font-size", "0.6rem").style("font-weight", "600").style("fill", "#c5d1de")
    .text(d => d.age);

  const b23 = document.getElementById("btn-crash-23");
  const b24 = document.getElementById("btn-crash-24");
  if(b23 && b24) {
    b23.addEventListener("click", () => {
      b23.classList.add("active"); b24.classList.remove("active");
      const nd = extractData("2023");
      petals.data(nd).transition().duration(800).ease(d3.easeElasticOut).attr("d", arcMaker);
      lbls.data(nd).transition().duration(800).ease(d3.easeElasticOut)
        .attr("text-anchor", d => {
          const a = (x(d.age) + x.bandwidth()/2) * 180 / Math.PI - 90;
          return (a > 90 && a < 270) ? "end" : "start";
        })
        .attr("transform", d => {
          const a = (x(d.age) + x.bandwidth()/2) * 180 / Math.PI - 90;
          return `rotate(${a}) translate(${y(d.count) + 10},0) ${a > 90 && a < 270 ? "rotate(180)" : ""}`;
        });
    });
    b24.addEventListener("click", () => {
      b24.classList.add("active"); b23.classList.remove("active");
      const nd = extractData("2024");
      petals.data(nd).transition().duration(800).ease(d3.easeElasticOut).attr("d", arcMaker);
      lbls.data(nd).transition().duration(800).ease(d3.easeElasticOut)
        .attr("text-anchor", d => {
          const a = (x(d.age) + x.bandwidth()/2) * 180 / Math.PI - 90;
          return (a > 90 && a < 270) ? "end" : "start";
        })
        .attr("transform", d => {
          const a = (x(d.age) + x.bandwidth()/2) * 180 / Math.PI - 90;
          return `rotate(${a}) translate(${y(d.count) + 10},0) ${a > 90 && a < 270 ? "rotate(180)" : ""}`;
        });
    });
  }
}

// ============================================================
// 9. MAGIC QUADRANT: ROAD CRASH VS FINES SCATTER
// ============================================================
async function drawCrashScatter() {
  const container = document.getElementById("chart-crash-scatter");
  if(!container) return;

  const crashVol24 = { NSW: 300, VIC: 271, QLD: 273, SA: 81, WA: 171, TAS: 28, NT: 52, ACT: 11 };
  
  const finesRaw = await d3.csv("data/grouped_fine_by_jurisdiction_and_detection.csv");
  const finesByState = JURISDICTIONS.map(st => {
    const sum = d3.sum(finesRaw.filter(d=>d.JURISDICTION.trim()===st), d => +d["Sum(FINES)"]);
    return { state: st, fines: sum, crashes: crashVol24[st] || 0 };
  });
  
  const W = container.offsetWidth || 800;
  const H = 400;
  const margin = {top:40, right:50, bottom:60, left:80};
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top - margin.bottom;
  
  const svg = d3.select("#chart-crash-scatter").append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
  
  const xMax = d3.max(finesByState, d=>d.fines);
  const x = d3.scaleLinear().domain([-xMax * 0.08, xMax*1.1]).range([0, iw]);
  const yMax = d3.max(finesByState, d=>d.crashes);
  const y = d3.scaleLinear().domain([-yMax * 0.05, yMax*1.1]).range([ih, 0]);
  
  const meanFines = d3.mean(finesByState, d=>d.fines);
  const meanCrashes = d3.mean(finesByState, d=>d.crashes);

  // Quadrant Backgrounds
  const qGrp = g.append("g").attr("class", "quadrants").style("opacity", 0.05);
  qGrp.append("rect").attr("x", x(meanFines)).attr("y", 0).attr("width", iw - x(meanFines)).attr("height", y(meanCrashes)).attr("fill", "#10b981"); // High Fines, High Crashes
  qGrp.append("rect").attr("x", 0).attr("y", 0).attr("width", x(meanFines)).attr("height", y(meanCrashes)).attr("fill", "#f59e0b"); // Low Fines, High Crashes
  qGrp.append("rect").attr("x", x(meanFines)).attr("y", y(meanCrashes)).attr("width", iw - x(meanFines)).attr("height", ih - y(meanCrashes)).attr("fill", "#2e9b66"); // High Fines, Low Crashes
  qGrp.append("rect").attr("x", 0).attr("y", y(meanCrashes)).attr("width", x(meanFines)).attr("height", ih - y(meanCrashes)).attr("fill", "#38bdf8"); // Low Fines, Low Crashes

  // Gridlines
  const xAxisGrid = d3.axisBottom(x).tickSize(-ih).tickFormat("").ticks(8);
  const yAxisGrid = d3.axisLeft(y).tickSize(-iw).tickFormat("").ticks(6);
  g.append("g").attr("class", "x-grid").attr("transform", `translate(0,${ih})`).call(xAxisGrid).selectAll("line").style("stroke", "rgba(255,255,255,0.05)").style("stroke-dasharray", "3,3");
  g.append("g").attr("class", "y-grid").call(yAxisGrid).selectAll("line").style("stroke", "rgba(255,255,255,0.05)").style("stroke-dasharray", "3,3");
  g.selectAll(".domain").remove();
  
  // Axes
  g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("~s")).tickSizeOuter(0)).selectAll("text").style("fill", "#8e9eb0").style("font-size","0.75rem");
  g.append("g").call(d3.axisLeft(y).ticks(6).tickSizeOuter(0)).selectAll("text").style("fill", "#8e9eb0").style("font-size","0.75rem");
  g.append("text").attr("x", iw/2).attr("y", ih + 45).attr("text-anchor", "middle").style("font-size","0.85rem").style("font-weight", "600").style("fill","#c5d1de").text("Total Detection Fines Extracted");
  g.append("text").attr("x", -ih/2).attr("y", -50).attr("transform", "rotate(-90)").attr("text-anchor", "middle").style("font-size","0.85rem").style("font-weight", "600").style("fill","#c5d1de").text("National Road Crashes (2024)");
   
  // National Average Crosshairs
  g.append("line").attr("x1", x(meanFines)).attr("x2", x(meanFines)).attr("y1", 0).attr("y2", ih).style("stroke", "rgba(255,255,255,0.4)").style("stroke-width", "2").style("stroke-dasharray", "4,4");
  g.append("line").attr("x1", 0).attr("x2", iw).attr("y1", y(meanCrashes)).attr("y2", y(meanCrashes)).style("stroke", "rgba(255,255,255,0.4)").style("stroke-width", "2").style("stroke-dasharray", "4,4");
  
  // Quadrant analytical labels
  g.append("text").attr("x", iw - 10).attr("y", 20).attr("text-anchor", "end").style("fill", "rgba(255,255,255,0.3)").style("font-size", "0.7rem").style("font-weight", "bold").text("HIGH ENFORCEMENT • HIGH RISK");
  g.append("text").attr("x", iw - 10).attr("y", ih - 10).attr("text-anchor", "end").style("fill", "rgba(255,255,255,0.3)").style("font-size", "0.7rem").style("font-weight", "bold").text("HIGH ENFORCEMENT • LOW RISK");
  g.append("text").attr("x", 20).attr("y", 20).attr("text-anchor", "start").style("fill", "rgba(255,255,255,0.3)").style("font-size", "0.7rem").style("font-weight", "bold").text("LOW ENFORCEMENT • HIGH RISK");
  g.append("text").attr("x", 20).attr("y", ih - 10).attr("text-anchor", "start").style("fill", "rgba(255,255,255,0.3)").style("font-size", "0.7rem").style("font-weight", "bold").text("LOW ENFORCEMENT • LOW RISK");

  // Plotting data
  const bubbleGrp = g.selectAll(".bubble-grp").data(finesByState).enter().append("g")
    .style("cursor", "pointer")
    .on("click", (e,d) => setGlobalFilter(d.state))
    .on("mouseover", function(e,d) {
       d3.select(this).select("circle").style("stroke-width", "4").style("filter", "brightness(1.5)");
       showTip(`<strong>${d.state} Synopsis</strong><br>Fines Volume: <strong>${d3.format(",")(d.fines)}</strong><br>Reported Crashes: <strong>${d.crashes}</strong><br><em>${d.fines > meanFines ? "Above" : "Below"} Nat. Avg Fines<br>${d.crashes > meanCrashes ? "Above" : "Below"} Nat. Avg Crashes</em>`, e);
    })
    .on("mousemove", moveTip).on("mouseout", function(e,d) {
       d3.select(this).select("circle").style("stroke-width", appState.activeJurisdiction===d.state?"4":"2").style("filter", "none");
       hideTip();
    });

  bubbleGrp.append("circle")
    .attr("cx", d=>x(d.fines)).attr("cy", d=>y(d.crashes))
    .attr("r", d => Math.max(10, Math.sqrt(d.crashes)*2.5)) 
    .style("fill", d => (PALETTE.jurisdictions[d.state] || "#10b981") + "66")
    .style("stroke", d => PALETTE.jurisdictions[d.state] || "#10b981").style("stroke-width", "2");
    
  bubbleGrp.append("text")
    .attr("x", d=>x(d.fines)).attr("y", d=>y(d.crashes)-Math.max(10, Math.sqrt(d.crashes)*2.5)-8)
    .attr("text-anchor","middle")
    .style("font-size","0.85rem").style("font-weight","800").style("fill", "#fbbf24")
    .text(d=>d.state);
    
  subscribeToFilter(tf => {
    bubbleGrp.style("opacity", d=>(tf && d.state!==tf)?0.1:1);
    bubbleGrp.selectAll("circle").style("stroke-width", d=>(tf && d.state===tf)?"4":"2");
  });
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
    { id: "chart-radar",        fn: drawRadarChart,       done: false },
    { id: "chart-crash-slope",  fn: drawCrashSlopegraph,  done: false },
    { id: "chart-crash-bar",    fn: drawCrashBarChart,    done: false },
    { id: "chart-crash-scatter",fn: drawCrashScatter,     done: false }
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
