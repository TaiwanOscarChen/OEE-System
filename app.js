// ==========================================
// 模組 0：Supabase 資料庫連線設定 (金鑰放這裡)
// ==========================================
const SUPABASE_URL = 'https://mmqsgkqpfpriwxztlxxc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_N_Srv_Q8WkoCq6Q_z1mp2g_JCCPQf73'; // 👉 把金鑰貼在這個單引號裡面！

// 啟動連線
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// (下面接著是你原本 app.js 裡的 模組 1：系統參數與防呆資料庫...)

// ==========================================
// 模組 1：系統參數與防呆資料庫 (模擬基礎設定)
// ==========================================
const sysConfig = {
    lines: ["SMT線", "DAF線", "雷切線", "結構組裝線"],
    machines: {
        "SMT線": ["SPG 印刷機", "SPI 錫膏檢查機", "NPM 貼片機", "BTU 迴焊爐"],
        "DAF線": ["DAF 貼合機(1)", "DAF 貼合機(2)", "Plasma 清洗機"],
        "雷切線": ["RTC-U 雷切機(1)", "RTC-U 雷切機(2)"]
    },
    reasons: [
        { name: "設備保養(PM)", type: "計畫性停機" },
        { name: "人員休息", type: "計畫性停機" },
        { name: "換線/首件", type: "非計畫停機 (Setup)" },
        { name: "設備故障", type: "非計畫停機 (Breakdown)" },
        { name: "缺料/待機", type: "非計畫停機 (Idle)" }
    ]
};

// 暫存陣列：用來放使用者當下輸入的多筆停機紀錄
let currentDowntimeRecords = [];

// ==========================================
// 模組 2：畫面初始化與 UI 互動邏輯
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. 自動帶入今天日期
    document.getElementById("workDate").valueAsDate = new Date();
    
    // 2. 載入線別下拉選單
    const lineSelect = document.getElementById("lineSelect");
    lineSelect.innerHTML = `<option value="">請選擇線別</option>`;
    sysConfig.lines.forEach(line => {
        lineSelect.innerHTML += `<option value="${line}">${line}</option>`;
    });

    // 3. 載入停機原因下拉選單
    const reasonSelect = document.getElementById("downtimeReason");
    sysConfig.reasons.forEach(r => {
        // 在選單上清楚標示是計畫性還是非計畫性 (防呆)
        reasonSelect.innerHTML += `<option value="${r.name}|${r.type}">[${r.type}] ${r.name}</option>`;
    });
});

// 切換側邊欄 Tab 的函數
function switchTab(tabId) {
    // 移除所有的 active
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    // 啟動點擊的 tab
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 當線別改變時，連動機台選單 (防呆機制)
function updateMachineList() {
    const line = document.getElementById("lineSelect").value;
    const machineSelect = document.getElementById("machineSelect");
    machineSelect.innerHTML = `<option value="">請選擇機台</option>`;
    
    if(sysConfig.machines[line]) {
        sysConfig.machines[line].forEach(machine => {
            machineSelect.innerHTML += `<option value="${machine}">${machine}</option>`;
        });
    }
}

// ==========================================
// 模組 3：停機紀錄新增與表格重繪邏輯
// ==========================================
function addDowntimeRecord() {
    const reasonVal = document.getElementById("downtimeReason").value;
    const mins = parseInt(document.getElementById("downtimeMins").value);
    const machine = document.getElementById("machineSelect").value;

    if(!machine || !reasonVal || isNaN(mins) || mins <= 0) {
        alert("⚠️ 防呆提示：請確認機台、停機原因與時間(大於0)皆已填寫！");
        return;
    }

    const [reasonName, reasonType] = reasonVal.split("|");

    // 將紀錄推進暫存陣列
    currentDowntimeRecords.push({
        machine: machine,
        type: reasonType,
        reason: reasonName,
        minutes: mins
    });

    // 清空輸入框
    document.getElementById("downtimeMins").value = '';
    
    // 重新畫表格
    renderDowntimeTable();
}

function renderDowntimeTable() {
    const tbody = document.getElementById("downtimeTableBody");
    tbody.innerHTML = '';
    let totalMins = 0;

    currentDowntimeRecords.forEach((record, index) => {
        totalMins += record.minutes;
        tbody.innerHTML += `
            <tr>
                <td>${record.machine}</td>
                <td><span style="color:${record.type.includes('非計畫') ? 'red' : 'green'}">${record.type}</span></td>
                <td>${record.reason}</td>
                <td>${record.minutes}</td>
                <td><button onclick="removeRecord(${index})" style="background:red; padding:5px;">刪除</button></td>
            </tr>
        `;
    });

    document.getElementById("totalDowntimeLabel").innerText = `此機台總停機：${totalMins} 分鐘`;
}

function removeRecord(index) {
    currentDowntimeRecords.splice(index, 1);
    renderDowntimeTable();
}

// ==========================================
// 模組 4：OEE 運算與 Supabase 儲存邏輯 (預備)
// ==========================================
async function saveMachineDataToDB() {
    // 這裡是你計算總工時、生產時間，並整合 currentDowntimeRecords 準備送到 Supabase 的地方
    alert("OEE 核心運算與 Supabase 儲存模組觸發！\n目前陣列中有 " + currentDowntimeRecords.length + " 筆停機資料。");
    // TODO: 串接 Supabase INSERT
}
