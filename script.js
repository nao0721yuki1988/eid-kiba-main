const unitsByGrade = {
  中1: typeof unitsChu1 !== "undefined" ? unitsChu1 : {},
  中2: typeof unitsChu2 !== "undefined" ? unitsChu2 : {},
  中3: typeof unitsChu3 !== "undefined" ? unitsChu3 : {},
  高1: typeof unitsKou1 !== "undefined" ? unitsKou1 : {},
  高2: typeof unitsKou2 !== "undefined" ? unitsKou2 : {},
  高3: typeof unitsKou3 !== "undefined" ? unitsKou3 : {}
};

let students = JSON.parse(localStorage.getItem("studentsData")) || [];
let selectedStudentId = null;

students.forEach(student => {
  student.homeworkRecords = (student.homeworkRecords || []).map(record => ({
    id: record.id,
    assignedDate: record.assignedDate || record.date || "",
    subject: record.subject || "",
    unit: record.unit || "",
    watched: record.watched ?? record.done ?? false,
    watchedDate: record.watchedDate || "",
    memo: record.memo || ""
  }));
});
saveData();

const users = [
  { id: "n_miwa", password: "0001", role: "manager", name: "教室長" },
  { id: "minami_m", password: "0130", role: "manager", name: "松村先生" },
  { id: "rua_n", password: "0127", role: "teacher", name: "中野村先生" },
  { id: "hiroto_k", password: "0128", role: "teacher", name: "小林先生" },
  { id: "tomoki_n", password: "0129", role: "teacher", name: "西村先生" },
  { id: "soushi_s", password: "0131", role: "teacher", name: "酒井先生" },
  { id: "hina_o", password: "0132", role: "teacher", name: "小田口先生" }

];

let currentUser = null;

function saveData() {
  localStorage.setItem("studentsData", JSON.stringify(students));
}

function generateId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000);
}

function addStudent() {
  const name = document.getElementById("studentName").value.trim();
  const grade = document.getElementById("studentGrade").value;

  if (!name || !grade) {
    alert("生徒名と学年を入力してね。");
    return;
  }

  const newStudent = {
    id: generateId(),
    name,
    grade,
    homeworkRecords: []
  };

  students.push(newStudent);
  saveData();

  document.getElementById("studentName").value = "";
  document.getElementById("studentGrade").value = "";

  renderStudentList();
}

function renderStudentList() {
  const studentList = document.getElementById("studentList");
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

    <h3>宿題記録を追加</h3>
    <input type="date" id="recordDate" />

    <select id="recordSubject" onchange="updateUnitOptions()">
      <option value="">教科を選択</option>
      <option value="国語">国語</option>
      <option value="数学">数学</option>
      <option value="英語">英語</option>
      <option value="理科">理科</option>
      <option value="社会">社会</option>
    </select>

    <select id="recordCategory">
     <option value="">分野を選択</option>
    </select>

    <div id="unitChecklist" class="unit-checklist">
      <div class="empty">教科を選ぶと単元が表示されるよ。</div>
    </div>

    <div id="selectedCount" class="info-text"></div>

    <textarea id="recordMemo" placeholder="メモ（任意）"></textarea>
    <button onclick="addHomeworkRecord()">選択した単元をまとめて追加</button>

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
      <tbody>
        ${unwatchedRows}
      </tbody>
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
      <tbody>
        ${watchedRows}
      </tbody>
    </table>
  `;

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("recordDate").value = today;
  
  const subjectSelect = document.getElementById("recordSubject");

if (subjectSelect) {
  subjectSelect.addEventListener("change", () => {
    const categorySelect = document.getElementById("recordCategory");
    const subject = subjectSelect.value;

    if (!categorySelect) return;

    if (subject === "社会") {
      categorySelect.innerHTML = `
        <option value="">分野を選択</option>
        <option value="地理">地理</option>
        <option value="歴史">歴史</option>
        <option value="公民">公民</option>
      `;
    } else {
      categorySelect.innerHTML = '<option value="">分野を選択</option>';
    }
  });
}
}

function updateUnitOptions() {
  const student = students.find(s => s.id === selectedStudentId);
  const subject = document.getElementById("recordSubject").value;
  const categorySelect = document.getElementById("recordCategory");
  const category = categorySelect ? categorySelect.value : "";

  const checklist = document.getElementById("unitChecklist");
  const selectedCount = document.getElementById("selectedCount");

  checklist.innerHTML = "";
  selectedCount.textContent = "";

  if (!student || !subject) {
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">分野を選択</option>';
    }
    checklist.innerHTML = '<div class="empty">教科を選ぶと単元が表示されるよ。</div>';
    return;
  }

  const gradeData = unitsByGrade[student.grade] || {};
  const subjectData = gradeData[subject] || {};

  // 社会以外なら分野選択をリセット
  if (subject !== "社会" && categorySelect) {
    categorySelect.innerHTML = '<option value="">分野を選択</option>';
  }

  // ▼ 社会だけ特別処理
  if (subject === "社会") {
    if (categorySelect) {
      categorySelect.innerHTML = `
        <option value="">分野を選択</option>
        <option value="地理">地理</option>
        <option value="歴史">歴史</option>
        <option value="公民">公民</option>
      `;
      categorySelect.value = category || "";
    }

    if (!category) {
      checklist.innerHTML = '<div class="empty">分野を選んでね。</div>';
      return;
    }

    const categoryData = subjectData[category] || {};
    renderChapterUnits(categoryData);
    return;
  }

  // ▼ 理科・英語など通常教科
  renderChapterUnits(subjectData);

  function renderChapterUnits(data) {
    if (Object.keys(data).length === 0) {
      checklist.innerHTML = '<div class="empty">単元がありません。</div>';
      return;
    }

    let html = "";

    Object.entries(data).forEach(([chapter, unitList]) => {
      html += `
        <details class="chapter-box">
          <summary>${chapter}</summary>
          <div class="chapter-units">
            ${unitList.map(unit => `
              <label class="unit-item">
                <input type="checkbox" class="unit-checkbox" value="${escapeHtml(unit)}" onchange="updateSelectedCount()" />
                <span>${escapeHtml(unit)}</span>
              </label>
            `).join("")}
          </div>
        </details>
      `;
    });

    checklist.innerHTML = html;
    updateSelectedCount();
  }
}

function addHomeworkRecord() {
  const student = students.find(s => s.id === selectedStudentId);
  if (!student) return;

  const assignedDate = document.getElementById("recordDate").value;
  const subject = document.getElementById("recordSubject").value;
  const memo = document.getElementById("recordMemo").value.trim();

  const checkedUnits = Array.from(document.querySelectorAll(".unit-checkbox:checked"));
  const selectedUnits = checkedUnits.map(checkbox => checkbox.value);

  if (!assignedDate || !subject || selectedUnits.length === 0) {
    alert("日付・教科・単元を入力してね。");
    return;
  }

  if (selectedUnits.length > 5) {
    alert("単元は5個まで選んでね。");
    return;
  }

  selectedUnits.forEach(unit => {
    student.homeworkRecords.push({
  id: generateId(),
  assignedDate,
  subject,
  unit,
  watched: false,
  watchedDate: "",
  memo
});
  });

  saveData();
  renderStudentDetail();
}

function toggleWatched(studentId, recordId) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const record = student.homeworkRecords.find(r => r.id === recordId);
  if (!record) return;

  record.watched = !record.watched;

  if (record.watched) {
    record.watchedDate = new Date().toISOString().split("T")[0];
  } else {
    record.watchedDate = "";
  }

  saveData();
  renderStudentDetail();
}

function deleteRecord(studentId, recordId) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;

  student.homeworkRecords = student.homeworkRecords.filter(r => r.id !== recordId);
  saveData();
  renderStudentDetail();
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
    alert("生徒登録は教室長のみ使えます。");
    return;
  }

  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("menuScreen").classList.add("hidden");
  document.getElementById("registerScreen").classList.add("hidden");
  document.getElementById("selectScreen").classList.add("hidden");
  document.getElementById("detailScreen").classList.add("hidden");

  const managerDashboardScreen = document.getElementById("managerDashboardScreen");
  if (managerDashboardScreen) {
    managerDashboardScreen.classList.add("hidden");
  }

  if (screenId === "menuScreen" || screenId === "loginScreen") {
    clearScreenData();
  }

  document.getElementById(screenId).classList.remove("hidden");
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

  const record = student.homeworkRecords.find(r => r.id === recordId);
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
      <button onclick="openManagerDashboard()">教室長用データ一覧</button>
    `;
  } else {
    menuButtons.innerHTML = `
      <button onclick="openSelectScreen()">生徒選択</button>
    `;
  }
}

function logout() {
  currentUser = null;
  selectedStudentId = null;
  clearScreenData();
  showScreen("loginScreen");
}

function openManagerRequestScreen() {
  if (!currentUser || currentUser.role !== "manager") {
    alert("この画面は教室長のみ使えます。");
    return;
  }

  alert("申し込み状況画面はこれから作るよ。");
}

function openManagerDashboard() {
  if (!currentUser || currentUser.role !== "manager") {
    alert("この画面は教室長のみ使えます。");
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

  html += `
      </tbody>
    </table>
  `;

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

  if (studentList) {
    studentList.innerHTML = "";
  }

  if (studentDetail) {
    studentDetail.innerHTML = '<div class="empty">生徒を選択してね。</div>';
  }

  if (managerDashboard) {
    managerDashboard.innerHTML = "";
  }
}

function deleteStudent(studentId, event) {
  if (event) {
    event.stopPropagation();
  }

  if (!currentUser || currentUser.role !== "manager") {
    alert("生徒削除は教室長のみ使えます。");
    return;
  }

  const student = students.find(s => s.id === studentId);
  if (!student) return;

  const ok = confirm(`「${student.name}」を削除していい？\n宿題記録も全部消えるよ。`);
  if (!ok) return;

  students = students.filter(s => s.id !== studentId);

  if (selectedStudentId === studentId) {
    selectedStudentId = null;
  }

  saveData();
  renderStudentList();
  renderStudentDetail();
}

renderStudentList();
renderStudentDetail();
showScreen("loginScreen");