(function () {
  var nativeFetch = window.fetch.bind(window);
  var mapUrl = "https://raw.githubusercontent.com/longwosion/geojson-map-china/master/china.json";
  var heatPalette = ["#f8fafc", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#0f172a"];
  var provinceAlias = {
    "新疆维吾尔自治区": "新疆",
    "西藏自治区": "西藏",
    "内蒙古自治区": "内蒙古",
    "广西壮族自治区": "广西",
    "宁夏回族自治区": "宁夏",
    "香港特别行政区": "香港",
    "澳门特别行政区": "澳门",
    "黑龙江省": "黑龙江",
    "北京市": "北京",
    "天津市": "天津",
    "上海市": "上海",
    "重庆市": "重庆"
  };

  function requestUrl(input) {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url;
    return "";
  }

  function mergeLaws(base, extra) {
    var lawMap = new Map();
    (Array.isArray(base) ? base : []).concat(Array.isArray(extra) ? extra : []).forEach(function (law) {
      if (law && law.title) lawMap.set(law.title, law);
    });
    return Array.from(lawMap.values());
  }

  window.fetch = function (input, init) {
    var url = requestUrl(input);
    if (url.indexOf("data/laws.json") !== -1) {
      return nativeFetch(input, init)
        .then(function (baseResponse) {
          return baseResponse.clone().json().then(function (baseLaws) {
            return nativeFetch("./data/supplemental-laws.json")
              .then(function (extraResponse) { return extraResponse.ok ? extraResponse.json() : []; })
              .catch(function () { return []; })
              .then(function (extraLaws) {
                return new Response(JSON.stringify(mergeLaws(baseLaws, extraLaws)), {
                  status: 200,
                  headers: { "Content-Type": "application/json; charset=utf-8" }
                });
              });
          });
        });
    }
    return nativeFetch(input, init);
  };

  function shortName(name) {
    return provinceAlias[name] || name.replace(/[省市]$/, "");
  }

  function colorFor(value, max) {
    if (!value) return heatPalette[0];
    var index = Math.min(heatPalette.length - 1, Math.max(1, Math.ceil((value / max) * (heatPalette.length - 1))));
    return heatPalette[index];
  }

  function injectStyle() {
    if (document.getElementById("runtime-map-style")) return;
    var style = document.createElement("style");
    style.id = "runtime-map-style";
    style.textContent = [
      ".china-map-image{display:block;width:100%;max-height:760px;object-fit:contain;border:1px solid #edf1f5;background:linear-gradient(180deg,rgba(248,250,252,.88),rgba(255,255,255,.96));}",
      ".map-loading{display:grid;place-items:center;min-height:420px;border:1px solid #edf1f5;background:#fff;color:#64748b;}"
    ].join("");
    document.head.appendChild(style);
  }

  function readTileValues(grid) {
    var values = new Map();
    grid.querySelectorAll(".map-cell").forEach(function (cell) {
      var name = cell.querySelector("strong") ? cell.querySelector("strong").textContent.trim() : "";
      var value = cell.querySelector("span") ? Number(cell.querySelector("span").textContent.trim()) : 0;
      if (name) values.set(name, Number.isFinite(value) ? value : 0);
    });
    return values;
  }

  function renderChinaMap(grid, mapData) {
    var values = readTileValues(grid);
    var max = Math.max(1, Array.from(values.values()).reduce(function (current, value) { return Math.max(current, value); }, 0));
    var canvas = document.createElement("canvas");
    var width = 1180;
    var height = 760;
    var pad = 34;
    var minLon = 73;
    var maxLon = 136;
    var minLat = 17;
    var maxLat = 54;
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    function project(point) {
      return [
        pad + ((point[0] - minLon) / (maxLon - minLon)) * (width - pad * 2),
        pad + ((maxLat - point[1]) / (maxLat - minLat)) * (height - pad * 2)
      ];
    }
    function drawRing(ring) {
      ring.forEach(function (point, index) {
        var projected = project(point);
        if (index === 0) ctx.moveTo(projected[0], projected[1]);
        else ctx.lineTo(projected[0], projected[1]);
      });
    }
    var background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#f8fafc");
    background.addColorStop(1, "#ffffff");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    mapData.features.forEach(function (feature) {
      var name = shortName(feature.properties.name);
      var value = values.get(name) || 0;
      var polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      ctx.beginPath();
      polygons.forEach(function (polygon) { polygon.forEach(drawRing); });
      ctx.closePath();
      ctx.fillStyle = colorFor(value, max);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.fill();
      ctx.stroke();
    });
    mapData.features.forEach(function (feature) {
      if (!feature.properties.cp) return;
      var name = shortName(feature.properties.name);
      var value = values.get(name) || 0;
      var projected = project(feature.properties.cp);
      var smallRegion = name === "香港" || name === "澳门";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = value / max > 0.55 ? "#ffffff" : "#17202a";
      ctx.font = smallRegion ? "600 13px Arial, sans-serif" : "600 18px Arial, sans-serif";
      ctx.fillText(name, projected[0], projected[1] - 8);
      ctx.font = smallRegion ? "12px Arial, sans-serif" : "16px Arial, sans-serif";
      ctx.fillText(String(value), projected[0], projected[1] + 14);
    });
    var image = document.createElement("img");
    image.className = "china-map-image";
    image.alt = "中国省级算法备案地区热力图";
    image.src = canvas.toDataURL("image/png");
    grid.replaceWith(image);
  }

  function patchMap() {
    var grid = document.querySelector(".china-map-grid");
    if (!grid || grid.dataset.runtimeRendered === "true") return;
    grid.dataset.runtimeRendered = "true";
    injectStyle();
    var loading = document.createElement("div");
    loading.className = "map-loading";
    loading.textContent = "正在绘制中国地图";
    grid.parentElement.insertBefore(loading, grid);
    nativeFetch(mapUrl)
      .then(function (response) { return response.json(); })
      .then(function (mapData) {
        loading.remove();
        renderChinaMap(grid, mapData);
      })
      .catch(function () {
        loading.remove();
        grid.dataset.runtimeRendered = "false";
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    patchMap();
    new MutationObserver(patchMap).observe(document.body, { childList: true, subtree: true });
  });
})();
