import { db } from "./firebase-config.js?v=1";

import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("hsMathCourses", typeof hsMathCourses !== "undefined" ? hsMathCourses : "未読込");

const unitsByGrade = {
  中1: typeof unitsChu1 !== "undefined" ? unitsChu1 : {},
  中2: typeof unitsChu2 !== "undefined" ? unitsChu2 : {},
  中3: typeof unitsChu3 !== "undefined" ? unitsChu3 : {},
};

const hsSubjects = {
  数学: typeof hsMathCourses !== "undefined" ? hsMathCourses : {},
  英語: typeof hsEnglishCourses !== "undefined" ? hsEnglishCourses : {}
};

window.hsMathCourses = hsMathCourses;

const users = [
  { id: "n_miwa", password: "0001", role: "manager", name: "三輪" },
  { id: "minami_m", password: "0130", role: "manager", name: "松村先生" },
  { id: "rua_n", password: "0127", role: "teacher", name: "中野村先生" },
  { id: "hiroto_k", password: "0128", role: "teacher", name: "小林先生" },
  { id: "tomoki_n", password: "0129", role: "teacher", name: "西村先生" },
  { id: "soushi_s", password: "0131", role: "teacher", name: "酒井先生" },
  { id: "hina_o", password: "0132", role: "teacher", name: "小田口先生" }
];

const subjectColors = {
  国語: "#4CAF50",
  数学: "#2196F3",
  英語: "#E91E63",
  理科: "#9C2780",
  社会: "#FF9800"
};

let students = [];
let selectedStudentId = null;
let currentUser = null;

function generateId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showScreen(screenId) {
  if (screenId === "registerScreen" && (!currentUser || currentUser.role !== "manager")) {
    alert("生徒登録は三輪先生のみ使えます。");
    return;
  }

  const screens = [
    "loginScreen",
    "menuScreen",
    "managerDashboardScreen",
    "registerScreen",
    "selectScreen",
    "detailScreen"
  ];

  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  if (screenId === "menuScreen" || screenId === "loginScreen") {
    clearScreenData();
  }

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove("hidden");
  }
}

function login() {
  const id = document.getElementById("loginId").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!id || !password) {
    alert("IDとパスワードを入力してね。");
    return;
  }

  const matchedUser = users.find(user => user.id === id && user.password === password);

  if (!matchedUser) {
    alert("IDまたはパスワードが違うよ。");
    return;
  }

  currentUser = matchedUser;
  renderMenu();
  showScreen("menuScreen");

  document.getElementById("loginId").value = "";
  document.getElementById("loginPassword").value = "";
}

function logout() {
  currentUser = null;
  selectedStudentId = null;
  clearScreenData();
  showScreen("loginScreen");
}

async function addStudent() {
  if (!currentUser || currentUser.role !== "manager") {
    alert("生徒登録は三輪先生のみ使えます。");
    return;
  }

  const name = document.getElementById("studentName").value.trim();
  const grade = document.getElementById("studentGrade").value;

  if (!name || !grade) {
    alert("生徒名と学年を入力してね。");
    return;
  }

  try {
    await addDoc(collection(db, "students"), {
      name,
      grade,
      homeworkRecords: []
    });

    document.getElementById("studentName").value = "";
    document.getElementById("studentGrade").value = "";

    const msg = document.getElementById("registerMessage");
    if (msg) msg.textContent = "登録したよ。";
  } catch (error) {
    console.error("生徒登録エラー:", error);
    alert("生徒登録に失敗したよ。");
  }
}

function renderStudentList() {
  const studentList = document.getElementById("studentList");
  if (!studentList) return;

  studentList.innerHTML = "";

  if (students.length === 0) {
    studentList.innerHTML = '<div class="empty">まだ生徒がいません。</div>';
    return;
  }

  students.forEach(student => {
    const div = document.createElement("div");
    div.className = "student-item" + (student.id === selectedStudentId ? " active" : "");

    div.innerHTML = `
      <div class="student-name">${escapeHtml(student.name)}</div>
      <div class="student-grade">${escapeHtml(student.grade)}</div>
      ${
        currentUser && currentUser.role === "manager"
          ? `<button class="delete-btn" onclick="deleteStudent('${student.id}', event)">生徒削除</button>`
          : ""
      }
    `;

    div.onclick = () => selectStudent(student.id);
    studentList.appendChild(div);
  });
}

function selectStudent(id) {
  selectedStudentId = id;
  renderStudentList();
  renderStudentDetail();
  showScreen("detailScreen");
}

function renderStudentDetail() {
  const student = students.find(s => s.id === selectedStudentId);
  const detail = document.getElementById("studentDetail");

  if (!detail) return;

  if (!student) {
    detail.innerHTML = '<div class="empty">生徒を選択してね。</div>';
    return;
  }

  const records = [...(student.homeworkRecords || [])].sort((a, b) => {
    const dateA = a.assignedDate || "";
    const dateB = b.assignedDate || "";
    return dateB.localeCompare(dateA);
  });

  const unwatchedRecords = records.filter(record => !record.watched);
  const watchedRecords = records.filter(record => record.watched);

  const unwatchedRows = unwatchedRecords.length === 0
    ? `<tr><td colspan="6" class="empty">未視聴の宿題はありません。</td></tr>`
    : unwatchedRecords.map(record => `
      <tr>
        <td>${escapeHtml(record.assignedDate || "")}</td>
        <td>${escapeHtml(record.subject || "")}</td>
        <td>${escapeHtml(record.unit || "")}</td>
        <td class="checkbox-cell">
          <input type="checkbox"
                 ${record.watched ? "checked" : ""}
                 onchange="toggleWatched('${student.id}', '${record.id}')" />
        </td>
        <td><div class="memo-small">${record.memo ? escapeHtml(record.memo) : ""}</div></td>
        <td>
          <button class="delete-btn" onclick="deleteRecord('${student.id}', '${record.id}')">削除</button>
        </td>
      </tr>
    `).join("");

  const watchedRows = watchedRecords.length === 0
    ? `<tr><td colspan="6" class="empty">視聴済みの宿題はありません。</td></tr>`
    : watchedRecords.map(record => `
      <tr>
        <td>${escapeHtml(record.watchedDate || "")}</td>
        <td>${escapeHtml(record.subject || "")}</td>
        <td>${escapeHtml(record.unit || "")}</td>
        <td>視聴済み</td>
        <td>
          <button onclick="showRecordDetail('${student.id}', '${record.id}')">確認</button>
        </td>
        <td>
          <button class="delete-btn" onclick="deleteRecord('${student.id}', '${record.id}')">削除</button>
        </td>
      </tr>
    `).join("");
  
  detail.innerHTML = `
  <div class="top-info">
    <strong>名前：</strong>${escapeHtml(student.name)}<br>
    <strong>学年：</strong>${escapeHtml(student.grade)}
  </div>

  <h3>カレンダー</h3>
  <div id="calendarControls">
    <input type="month" id="calendarMonth" />
  </div>
  <div id="studentCalendar"></div>

  <div class="button-row" style="margin-top:16px;">
    <button id="toggleTaskFormBtn" type="button">宿題を追加</button>
  </div>

  <div id="taskFormArea" class="hidden" style="margin-top:16px;">
    <h3>宿題記録を追加</h3>

    <div class="date-row">
      <input type="date" id="recordStartDate" />
      <input type="date" id="recordEndDate" />
    </div>

  <select id="recordSubject" onchange="updateUnitOptions('subject')">
   <option value="">教科を選択</option>
   <option value="国語">国語</option>
   <option value="数学">数学</option>
   <option value="英語">英語</option>
   <option value="理科">理科</option>
   <option value="社会">社会</option>
  </select>

    <!-- 中学生用 -->
<div id="juniorFields">
  <select id="recordCategory" onchange="updateUnitOptions('category')">
    <option value="">分野を選択</option>
  </select>
</div>

<!-- 高校生用 -->
<div id="highFields">
  <select id="recordCourse" onchange="updateUnitOptions('course')">
    <option value="">講座を選択</option>
  </select>

  <select id="recordChapter" onchange="updateUnitOptions('chapter')">
    <option value="">章を選択</option>
  </select>

  <select id="recordSection" onchange="updateUnitOptions('section')">
    <option value="">節を選択</option>
  </select>
</div>

    <div id="unitChecklist" class="unit-checklist">
      <div class="empty">教科を選んでね。</div>
    </div>

    <div id="selectedCount" class="info-text"></div>

    <textarea id="recordMemo" placeholder="メモ（任意）"></textarea>
    <button onclick="addHomeworkRecord()">選択した単元をまとめて追加</button>
  </div>

  <h3>未視聴</h3>
  <table>
    <thead>
      <tr>
        <th>出した日</th>
        <th>教科</th>
        <th>単元</th>
        <th>視聴</th>
        <th>メモ</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>${unwatchedRows}</tbody>
  </table>

  <h3>視聴済み</h3>
  <table>
    <thead>
      <tr>
        <th>視聴日</th>
        <th>教科</th>
        <th>単元</th>
        <th>状態</th>
        <th>内容</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>${watchedRows}</tbody>
  </table>
`;

 const today = new Date().toISOString().split("T")[0];

const recordStartDate = document.getElementById("recordStartDate");
const recordEndDate = document.getElementById("recordEndDate");

if (recordStartDate) recordStartDate.value = today;
if (recordEndDate) recordEndDate.value = today;

const calendarMonth = document.getElementById("calendarMonth");
if (calendarMonth) {
  calendarMonth.value = today.slice(0, 7);
}

const toggleTaskFormBtn = document.getElementById("toggleTaskFormBtn");
const taskFormArea = document.getElementById("taskFormArea");

if (toggleTaskFormBtn && taskFormArea) {
  toggleTaskFormBtn.addEventListener("click", () => {
    taskFormArea.classList.toggle("hidden");
    toggleTaskFormBtn.textContent = taskFormArea.classList.contains("hidden")
      ? "宿題を追加"
      : "宿題入力を閉じる";
  });

const juniorFields = document.getElementById("juniorFields");
const highFields = document.getElementById("highFields");

if (student.grade.includes("中")) {
  if (juniorFields) juniorFields.style.display = "block";
  if (highFields) highFields.style.display = "none";
} else {
  if (juniorFields) juniorFields.style.display = "none";
  if (highFields) highFields.style.display = "block";
}
}

const manthInput = document.getElementById("calendarMonth");
if (manthInput && !manthInput.value){
  manthInput.value = new Date().toISOString().slice(0, 7);
}

renderStudentCalendar(student);
}

function updateUnitOptions(changedBy = "subject") {
  const student = students.find(s => s.id === selectedStudentId);
  const subject = document.getElementById("recordSubject").value;
  const categorySelect = document.getElementById("recordCategory");
  const checklist = document.getElementById("unitChecklist");
  const selectedCount = document.getElementById("selectedCount");

  if (!student || !checklist || !selectedCount) return;

  checklist.innerHTML = "";
  selectedCount.textContent = "";

  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">分野を選択</option>';
  }

  // 高校数学
  if (subject === "数学" && typeof hsMathCourses !== "undefined" && !student.grade.includes("中")) {
    if (categorySelect) categorySelect.style.display = "none";
    return;
  }

  // 中学生
  if (student.grade.includes("中")) {
     const gradeData = unitsByGrade[student.grade] || {};

     // 理科は分野なしで直接章表示
    if (subject === "理科") {
      if (categorySelect) categorySelect.style.display = "none";

      const scienceData = gradeData["理科"] || {};
      renderChapterUnits(scienceData);
      return;
    }

// 社会だけ分野あり
if (subject === "社会") {
  if (categorySelect) {
    categorySelect.style.display = "block";

    if (changedBy === "subject") {
      categorySelect.innerHTML = `
        <option value="">分野を選択</option>
        <option value="地理">地理</option>
        <option value="歴史">歴史</option>
        <option value="公民">公民</option>
      `;
    }
  }

  const category = categorySelect ? categorySelect.value : "";
  if (!category) {
    checklist.innerHTML = '<div class="empty">分野を選んでね。</div>';
    return;
  }

  const socialData = gradeData["社会"] || {};
  const categoryData = socialData[category] || {};
  renderChapterUnits(categoryData);
  return;
}

// それ以外の中学教科（国語・数学・英語）
if (categorySelect) categorySelect.style.display = "none";

console.log("中学その他 subject:", subject);
console.log("中学その他 data:", gradeData[subject]);

const generalData = gradeData[subject] || {};
console.log("generalData raw:", generalData);
console.log("generalData keys:", Object.keys(generalData));

renderChapterUnits(generalData);
return;
  }

  // ここに来るのは主に高校の数学以外
  if (categorySelect) categorySelect.style.display = "none";
}

function renderChapterUnits(data) {
  const checklist = document.getElementById("unitChecklist");
  console.log("checklist:", checklist);
  console.log("data inside render:", data);

  if (!checklist) return;

  if (!data || Object.keys(data).length === 0) {
    checklist.innerHTML = '<div class="empty">単元がありません。</div>';
    console.log("emptyを書き込み");
    return;
  }

  let html = "";

  Object.entries(data).forEach(([chapter, unitList]) => {
    html += `
      <details class="chapter-box">
        <summary>${escapeHtml(chapter)}</summary>
        <div class="chapter-units">
          ${unitList.map(unit => `
            <label class="unit-item">
              <input type="checkbox"
                     class="unit-checkbox"
                     value="${escapeHtml(unit)}"
                     onchange="updateSelectedCount()" />
              <span>${escapeHtml(unit)}</span>
            </label>
          `).join("")}
        </div>
      </details>
    `;
  });

  console.log("renderするhtml:", html);

  checklist.innerHTML = html;

  console.log("書き込み後のinnerHTML:", checklist.innerHTML);

  updateSelectedCount();
}

async function addHomeworkRecord() {
  const student = students.find(s => s.id === selectedStudentId);
  if (!student) {
    alert("生徒情報が見つからないよ。");
    return;
  }

  const startDate = document.getElementById("recordStartDate")?.value || "";
  const endDate = document.getElementById("recordEndDate")?.value || "";
  const subject = document.getElementById("recordSubject")?.value || "";
  const category = document.getElementById("recordCategory")?.value || "";
  const course = document.getElementById("recordCourse")?.value || "";
  const chapter = document.getElementById("recordChapter")?.value || "";
  const section = document.getElementById("recordSection")?.value || "";
  const memo = document.getElementById("recordMemo")?.value.trim() || "";

  const checkedUnits = Array.from(
    document.querySelectorAll(".unit-checkbox:checked")
  ).map(cb => cb.value);

  if (!startDate || !endDate) {
    alert("開始日と終了日を入れてね。");
    return;
  }

  if (!subject) {
    alert("教科を選んでね。");
    return;
  }

  if (checkedUnits.length === 0) {
    alert("単元を1つ以上選んでね。");
    return;
  }

  const newRecords = checkedUnits.map(unit => ({
    id: generateId(),
    startDate,
    endDate,
    subject,
    category,
    course,
    chapter,
    section,
    unit,
    watched: false,
    watchedDate: "",
    memo
  }));

  const updatedRecords = [...(student.homeworkRecords || []), ...newRecords];

  try {
    const studentRef = doc(db, "students", student.id);

    await updateDoc(studentRef, {
      homeworkRecords: updatedRecords
    });

    student.homeworkRecords = updatedRecords;

    alert(`${checkedUnits.length}件追加したよ。`);

    // 入力欄リセット
    document.querySelectorAll(".unit-checkbox").forEach(cb => {
      cb.checked = false;
    });

    const selectedCount = document.getElementById("selectedCount");
    if (selectedCount) {
      selectedCount.textContent = "0個選択中";
    }

    const memoEl = document.getElementById("recordMemo");
    if (memoEl) memoEl.value = "";

    renderStudentDetail();
  } catch (error) {
    console.error("保存エラー:", error);
    alert("保存に失敗したよ。Consoleを見てね。");
  }
}

async function toggleWatched(studentId, recordId) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const updatedRecords = (student.homeworkRecords || []).map(record => {
    if (record.id !== recordId) return record;

    const nextWatched = !record.watched;
    return {
      ...record,
      watched: nextWatched,
      watchedDate: nextWatched ? new Date().toISOString().split("T")[0] : ""
    };
  });

  try {
    await updateDoc(doc(db, "students", studentId), {
      homeworkRecords: updatedRecords
    });
  } catch (error) {
    console.error("視聴状態更新エラー:", error);
    alert("更新に失敗したよ。");
  }
}

async function deleteRecord(studentId, recordId) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const updatedRecords = (student.homeworkRecords || []).filter(r => r.id !== recordId);

  try {
    await updateDoc(doc(db, "students", studentId), {
      homeworkRecords: updatedRecords
    });
  } catch (error) {
    console.error("記録削除エラー:", error);
    alert("削除に失敗したよ。");
  }
}

async function deleteStudent(studentId, event) {
  if (event) event.stopPropagation();

  if (!currentUser || currentUser.role !== "manager") {
    alert("生徒削除は三輪先生のみ使えます。");
    return;
  }

  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const ok = confirm(`「${student.name}」を削除していい？\n宿題記録も全部消えるよ。`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "students", studentId));

    if (selectedStudentId === studentId) {
      selectedStudentId = null;
    }
  } catch (error) {
    console.error("生徒削除エラー:", error);
    alert("削除に失敗したよ。");
  }
}

function openSelectScreen() {
  if (!currentUser) {
    alert("先にログインしてね。");
    return;
  }

  renderStudentList();
  showScreen("selectScreen");
}

function updateSelectedCount() {
  const checkedUnits = document.querySelectorAll(".unit-checkbox:checked");
  const selectedCount = document.getElementById("selectedCount");
  if (!selectedCount) return;
  selectedCount.textContent = `${checkedUnits.length}件選択中`;
}

function showRecordDetail(studentId, recordId) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const record = (student.homeworkRecords || []).find(r => r.id === recordId);
  if (!record) return;

  alert(
    `【内容確認】\n\n` +
    `生徒名: ${student.name}\n` +
    `学年: ${student.grade}\n` +
    `教科: ${record.subject}\n` +
    `単元: ${record.unit}\n` +
    `出した日: ${record.assignedDate || ""}\n` +
    `視聴日: ${record.watchedDate || ""}\n` +
    `メモ: ${record.memo || "なし"}`
  );
}

function renderMenu() {
  const currentUserInfo = document.getElementById("currentUserInfo");
  const menuButtons = document.getElementById("menuButtons");

  if (!currentUserInfo || !menuButtons || !currentUser) return;

  currentUserInfo.innerHTML = `
    <strong>ログイン中：</strong>${escapeHtml(currentUser.name)}　
    <strong>権限：</strong>${currentUser.role === "manager" ? "教室長" : "講師"}
  `;

  if (currentUser.role === "manager") {
    menuButtons.innerHTML = `
      <button onclick="showScreen('registerScreen')">生徒登録</button>
      <button onclick="openSelectScreen()">生徒選択</button>
      <button onclick="openManagerRequestScreen()">申し込み状況</button>
      <button onclick="openManagerDashboard()">三輪用データ一覧</button>
    `;
  } else {
    menuButtons.innerHTML = `
      <button onclick="openSelectScreen()">生徒選択</button>
    `;
  }
}

function openManagerRequestScreen() {
  if (!currentUser || currentUser.role !== "manager") {
    alert("この画面は三輪先生のみ使えます。");
    return;
  }

  alert("申し込み状況画面はこれから作るよ。");
}

function openManagerDashboard() {
  if (!currentUser || currentUser.role !== "manager") {
    alert("この画面は三輪先生のみ使えます。");
    return;
  }

  renderManagerDashboard();
  showScreen("managerDashboardScreen");
}

function getSubjectCounts(student, subject) {
  const records = (student.homeworkRecords || []).filter(record => record.subject === subject);
  const watchedCount = records.filter(record => record.watched).length;
  const unwatchedCount = records.filter(record => !record.watched).length;
  return { watchedCount, unwatchedCount };
}

function renderManagerDashboard() {
  const dashboard = document.getElementById("managerDashboard");
  if (!dashboard) return;

  if (students.length === 0) {
    dashboard.innerHTML = '<div class="empty">生徒がまだ登録されていません。</div>';
    return;
  }

  const subjects = ["英語", "数学", "理科", "社会"];

  let html = `
    <table>
      <thead>
        <tr>
          <th>生徒名</th>
          <th>学年</th>
          ${subjects.map(subject => `
            <th>${subject} 完了</th>
            <th>${subject} 未視聴</th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  students.forEach(student => {
    html += `<tr>`;
    html += `
      <td>
        <button onclick="openStudentFromDashboard('${student.id}')">
          ${escapeHtml(student.name)}
        </button>
      </td>
    `;
    html += `<td>${escapeHtml(student.grade)}</td>`;

    subjects.forEach(subject => {
      const { watchedCount, unwatchedCount } = getSubjectCounts(student, subject);

      html += `
        <td>
          <button onclick="showSubjectRecords('${student.id}', '${subject}', true)">
            ${watchedCount}
          </button>
        </td>
        <td>
          <button onclick="showSubjectRecords('${student.id}', '${subject}', false)">
            ${unwatchedCount}
          </button>
        </td>
      `;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;
  dashboard.innerHTML = html;
}

function openStudentFromDashboard(studentId) {
  selectedStudentId = studentId;
  renderStudentDetail();
  showScreen("detailScreen");
}

function showSubjectRecords(studentId, subject, watchedStatus) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const records = (student.homeworkRecords || []).filter(record =>
    record.subject === subject && record.watched === watchedStatus
  );

  if (records.length === 0) {
    alert(`${student.name} の ${subject} には該当データがありません。`);
    return;
  }

  const title = watchedStatus ? "視聴済み単元" : "未視聴単元";

  const lines = records.map(record => {
    const dateText = watchedStatus
      ? `視聴日: ${record.watchedDate || "未記録"}`
      : `出した日: ${record.assignedDate || "未記録"}`;

    return `・${record.unit}（${dateText}）`;
  });

  alert(
    `【${student.name} / ${subject} / ${title}】\n\n` +
    lines.join("\n")
  );
}

function clearScreenData() {
  const studentList = document.getElementById("studentList");
  const studentDetail = document.getElementById("studentDetail");
  const managerDashboard = document.getElementById("managerDashboard");

  if (studentList) studentList.innerHTML = "";
  if (studentDetail) studentDetail.innerHTML = '<div class="empty">生徒を選択してね。</div>';
  if (managerDashboard) managerDashboard.innerHTML = "";
}

function subscribeStudents() {
  onSnapshot(
    collection(db, "students"),
    (snapshot) => {
      students = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        homeworkRecords: [],
        ...docSnap.data()
      }));

      renderStudentList();
      renderStudentDetail();

      const managerDashboardScreen = document.getElementById("managerDashboardScreen");
      if (managerDashboardScreen && !managerDashboardScreen.classList.contains("hidden")) {
        renderManagerDashboard();
      }
    },
    (error) => {
      console.error("Firestore購読エラー:", error);
    }
  );
}

function renderStudentCalendar(student) {
  const monthInput = document.getElementById("calendarMonth");
  const calendarEl = document.getElementById("studentCalendar");
  if (!monthInput || !calendarEl || !student) return;

  const monthValue = monthInput.value || new Date().toISOString().slice(0, 7);
  const [year, month] = monthValue.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const subjects = ["国語", "数学", "英語", "理科", "社会"];
  const dayWidth = 36; // 1日ぶんの幅
  const totalWidth = dayWidth * daysInMonth;

  let html = `<table class="calendar-table">`;
  html += `<thead><tr><th class="calendar-subject-cell">教科</th>`;

  for (let day = 1; day <= daysInMonth; day++) {
    html += `<th class="calendar-day-header">${day}</th>`;
  }

  html += `</tr></thead><tbody>`;

  subjects.forEach(subject => {
    html += `<tr>`;
    html += `<th class="calendar-subject-cell">${subject}</th>`;

    // 1行ぶんの背景セル
    html += `<td colspan="${daysInMonth}" class="calendar-day-cell">`;
    html += `<div class="calendar-track" style="width:${totalWidth}px;">`;

    const subjectRecords = (student.homeworkRecords || []).filter(record => {
  return record.subject === subject;
});

// 同じ期間のレコードをまとめる
const grouped = {};

subjectRecords.forEach(record => {
  const key = `${record.startDate}_${record.endDate}_${record.subject}`;
  if (!grouped[key]) {
    grouped[key] = [];
  }
  grouped[key].push(record);
});

Object.values(grouped).forEach(groupRecords => {
  const firstRecord = groupRecords[0];

  const start = new Date(firstRecord.startDate);
  const end = new Date(firstRecord.endDate);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  const visibleStart = start < monthStart ? monthStart : start;
  const visibleEnd = end > monthEnd ? monthEnd : end;

  if (visibleStart > visibleEnd) return;

  const startDay = visibleStart.getDate();
  const endDay = visibleEnd.getDate();

  const left = (startDay - 1) * dayWidth + 1;
  const width = (endDay - startDay + 1) * dayWidth - 2;

  const color = subjectColors[firstRecord.subject] || "#999";

  const unitsHtml = `<div class="calendar-bar-unit">${groupRecords[0].unit}</div>`;
  
  html += `
    <div class="calendar-bar"
         style="left:${left}px; width:${width}px; background:${color};"
         onclick="showCalendarRecordDetail('${firstRecord.startDate}', '${firstRecord.endDate}', '${firstRecord.subject}')">
      ${unitsHtml}
    </div>
  `;
});

    html += `</div></td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  calendarEl.innerHTML = html;
}

function showCalendarRecordDetail(startDate, endDate, subject) {
  const student = students.find(s => s.id === selectedStudentId);
  if (!student) return;

  const records = (student.homeworkRecords || []).filter(record => {
    return (
      record.subject === subject &&
      record.startDate === startDate &&
      record.endDate === endDate
    );
  });

  if (records.length === 0) return;

  let html = "";

  records.forEach(record => {
    html += `
      <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #eee;">
        <p><strong>教科：</strong>${record.subject}</p>
        <p><strong>単元：</strong>${record.unit}</p>
        <p><strong>期間：</strong>${record.startDate}〜${record.endDate}</p>
        <p><strong>視聴：</strong>${record.watched ? "視聴済み" : "未視聴"}</p>
        <p><strong>メモ：</strong>${record.memo || "なし"}</p>
      </div>
    `;
  });

  document.getElementById("recordModalBody").innerHTML = html;
  document.getElementById("recordModal").style.display = "block";
}

function closeRecordModal() {
  document.getElementById("recordModal").style.display = "none";
}

window.showCalendarRecordDetail = showCalendarRecordDetail;
window.closeRecordModal = closeRecordModal;


window.login = login;
window.logout = logout;
window.showScreen = showScreen;
window.openSelectScreen = openSelectScreen;
window.openManagerDashboard = openManagerDashboard;
window.openManagerRequestScreen = openManagerRequestScreen;
window.addStudent = addStudent;
window.selectStudent = selectStudent;
window.addHomeworkRecord = addHomeworkRecord;
window.toggleWatched = toggleWatched;
window.deleteRecord = deleteRecord;
window.deleteStudent = deleteStudent;
window.openStudentFromDashboard = openStudentFromDashboard;
window.showSubjectRecords = showSubjectRecords;
window.updateUnitOptions = updateUnitOptions;
window.updateSelectedCount = updateSelectedCount;
window.showRecordDetail = showRecordDetail;
window.showCalendarRecordDetail = showCalendarRecordDetail;

console.log("add.js 読み込み成功");
subscribeStudents();
renderStudentDetail();
showScreen("loginScreen");
renderStudentCalendar();

document.addEventListener("change", function (event) {
  const target = event.target;

  // 教科 → 講座
  if (target.id === "recordSubject") {
  const student = students.find(s => s.id === selectedStudentId);
  const subjectSelect = document.getElementById("recordSubject");
  const courseSelect = document.getElementById("recordCourse");
  const chapterSelect = document.getElementById("recordChapter");
  const sectionSelect = document.getElementById("recordSection");
  const unitContainer = document.getElementById("unitChecklist");

  if (!student || !subjectSelect || !courseSelect || !chapterSelect || !sectionSelect || !unitContainer) return;

  const subject = subjectSelect.value;

  // 中学生は updateUnitOptions に任せる
  if (student.grade.includes("中")) {
    updateUnitOptions("subject");
    return;
  }

  courseSelect.innerHTML = `<option value="">講座を選択</option>`;
  chapterSelect.innerHTML = `<option value="">章を選択</option>`;
  sectionSelect.innerHTML = `<option value="">節を選択</option>`;
  unitContainer.innerHTML = `<div class="empty">教科を選んでね。</div>`;

  const subjectCourses = hsSubjects[subject] || {};

  if (Object.keys(subjectCourses).length === 0) {
    unitContainer.innerHTML = `<div class="empty">この教科の講座データはまだありません。</div>`;
    return;
  }

  Object.keys(subjectCourses).forEach(course => {
    const option = document.createElement("option");
    option.value = course;
    option.textContent = course;
    courseSelect.appendChild(option);
  });

  unitContainer.innerHTML = `<div class="empty">講座を選んでね。</div>`;
  return;
}

  if (target.id === "recordCourse") {
  const student = students.find(s => s.id === selectedStudentId);
  const subject = document.getElementById("recordSubject").value;
  const courseSelect = document.getElementById("recordCourse");
  const chapterSelect = document.getElementById("recordChapter");
  const sectionSelect = document.getElementById("recordSection");
  const unitContainer = document.getElementById("unitChecklist");

  if (!student || !courseSelect || !chapterSelect || !sectionSelect || !unitContainer) return;

  const course = courseSelect.value;

  chapterSelect.innerHTML = `<option value="">章を選択</option>`;
  sectionSelect.innerHTML = `<option value="">節を選択</option>`;
  unitContainer.innerHTML = `<div class="empty">章を選んでね。</div>`;

  // 高校生だけ動かす
  if (student.grade.includes("中")) return;

  const subjectCourses = hsSubjects[subject] || {};
  if (!course || !subjectCourses[course]) return;

  Object.keys(subjectCourses[course]).forEach(chapter => {
    const option = document.createElement("option");
    option.value = chapter;
    option.textContent = chapter;
    chapterSelect.appendChild(option);
  });
}

  // 章 → 節
 if (target.id === "recordChapter") {
  const student = students.find(s => s.id === selectedStudentId);
  const subject = document.getElementById("recordSubject").value;
  const courseSelect = document.getElementById("recordCourse");
  const chapterSelect = document.getElementById("recordChapter");
  const sectionSelect = document.getElementById("recordSection");
  const unitContainer = document.getElementById("unitChecklist");

  if (!student || !courseSelect || !chapterSelect || !sectionSelect || !unitContainer) return;

  const course = courseSelect.value;
  const chapter = chapterSelect.value;

  sectionSelect.innerHTML = `<option value="">節を選択</option>`;
  unitContainer.innerHTML = `<div class="empty">節を選んでね。</div>`;

  if (student.grade.includes("中")) return;

  const subjectCourses = hsSubjects[subject] || {};
  if (!course || !chapter || !subjectCourses[course]?.[chapter]) return;

  Object.keys(subjectCourses[course][chapter]).forEach(section => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    sectionSelect.appendChild(option);
  
  });
}

  // 節 → 単元
 if (target.id === "recordSection") {
  const student = students.find(s => s.id === selectedStudentId);
  const subject = document.getElementById("recordSubject").value;
  const courseSelect = document.getElementById("recordCourse");
  const chapterSelect = document.getElementById("recordChapter");
  const sectionSelect = document.getElementById("recordSection");
  const unitContainer = document.getElementById("unitChecklist");

  if (!student || !courseSelect || !chapterSelect || !sectionSelect || !unitContainer) return;

  const course = courseSelect.value;
  const chapter = chapterSelect.value;
  const section = sectionSelect.value;

  unitContainer.innerHTML = "";

  if (student.grade.includes("中")) return;

  const subjectCourses = hsSubjects[subject] || {};
  const units = subjectCourses[course]?.[chapter]?.[section];

  if (!units || !Array.isArray(units)) {
    unitContainer.innerHTML = `<div class="empty">単元がありません。</div>`;
    return;
  }

  units.forEach(unit => {
    const label = document.createElement("label");
    label.className = "unit-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "unit-checkbox";
    checkbox.value = unit;
    checkbox.onchange = updateSelectedCount;

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(unit));

    unitContainer.appendChild(label);
    unitContainer.appendChild(document.createElement("br"));

  });
} 

   if (target.id === "calendarMonth") {
  const student = students.find(s => s.id === selectedStudentId);
  renderStudentCalendar(student);
  }
  
  updateSelectedCount();

});

