function getAllHomeworkRecords() {
  const allRecords = [];

  students.forEach(student => {
    (student.homeworkRecords || []).forEach(record => {
      allRecords.push({
        studentName: student.name,
        grade: student.grade,
        subject: record.subject,
        unit: record.unit,
        assignedDate: record.assignedDate || "",
        watched: record.watched || false,
        watchedDate: record.watchedDate || ""
      });
    });
  });

  return allRecords;
}