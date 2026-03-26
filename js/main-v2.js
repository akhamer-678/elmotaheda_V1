// main.js محدث للسكشن + الفورم القديمة
document.addEventListener("DOMContentLoaded", async function () {
  // ===== عناصر الصفحة =====
  const specialtySelect = document.getElementById("specialty"); // سكشن اليوم
  const doctorSelect = document.getElementById("doctor"); // فورم القديمة
  const doctorSpecialtySelect = document.getElementById("doctorSpecialty"); // فورم القديمة
  const availableDoctorsList = document.getElementById("availableDoctorsList");
  const searchButton = document.getElementById("searchDoctorsToday"); // زر عرض اليوم

  const supabaseUrl = "https://rfwylqnkkaxaapinapaz.supabase.co";
  const supabaseKey = "sb_publishable_xfBrhWGol1KRURhE_5a6w_Mm6iSLUj";
  const mysupabase = supabase.createClient(supabaseUrl, supabaseKey);

  // ===== تحميل التخصصات =====
  const { data: specialties, error: errSpecialties } = await mysupabase
    .from("specialties")
    .select("*");

  if (errSpecialties) {
    console.error("Error loading specialties:", errSpecialties);
    return;
  }

  // إضافة التخصصات للسكشن الجديد
  specialties.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item["special-name"];
    specialtySelect.appendChild(option);
  });

  // إضافة التخصصات للفورم القديمة
  specialties.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item["special-name"];
    doctorSpecialtySelect.appendChild(option);
  });

  // ===== الفورم القديمة: عند اختيار تخصص =====
  doctorSpecialtySelect.addEventListener("change", async function () {
    const specialtyId = this.value;
    doctorSelect.innerHTML = `<option value="" disabled selected>اختر الطبيب</option>`;
    doctorSelect.disabled = true;

    const { data: doctors, error: errDoctors } = await mysupabase
      .from("doctors")
      .select("*")
      .eq("special_id", specialtyId)
      .eq("is_avaliable", true);

    if (errDoctors) {
      console.error("Error loading doctors:", errDoctors);
      return;
    }

    if (doctors && doctors.length > 0) {
      doctorSelect.disabled = false;
      doctors.forEach((doc) => {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc["doc_name"];
        doctorSelect.appendChild(option);
      });
    }
  });

  // ===== الفورم القديمة: submit =====
  const form = document.getElementById("bookingForm");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const doctorId = doctorSelect.value;
    if (!doctorId) {
      alert("اختار الدكتور الأول");
      return;
    }
    window.location.href = `booking.html?doctor_id=${doctorId}`;
  });

  // ===== السكشن الجديد: البحث عن الأطباء اليوم =====
  searchButton.addEventListener("click", async function () {
    const specialtyId = specialtySelect.value;
    if (!specialtyId) {
      alert("اختر التخصص أولاً");
      return;
    }

    availableDoctorsList.innerHTML = "<p>جارٍ البحث عن الأطباء...</p>";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // جلب مواعيد اليوم من doc_schedual
    const { data: schedules, error: errSchedules } = await mysupabase
      .from("doc_schedual")
      .select("doc_id, date")
      .gte("date", todayStart.toISOString())
      .lte("date", todayEnd.toISOString());

    if (errSchedules) {
      console.error("Error loading schedules:", errSchedules);
      availableDoctorsList.innerHTML = "<p>حدث خطأ أثناء جلب المواعيد.</p>";
      return;
    }

    const doctorIdsToday = schedules.map((s) => s.doc_id);

    if (!doctorIdsToday.length) {
      availableDoctorsList.innerHTML = "<p>لا يوجد أطباء متاحين اليوم.</p>";
      return;
    }

    // جلب بيانات الأطباء حسب التخصص
    const { data: doctors, error: errDoctors } = await mysupabase
      .from("doctors")
      .select("*")
      .in("id", doctorIdsToday)
      .eq("special_id", specialtyId)
      .eq("is_avaliable", true);

    if (errDoctors || !doctors || doctors.length === 0) {
      availableDoctorsList.innerHTML = "<p>لا يوجد أطباء متاحين اليوم.</p>";
      return;
    }

    // عرض الكروت
    availableDoctorsList.innerHTML = "";
    doctors.forEach((doc, index) => {
      const firstSchedule = schedules.find((s) => s.doc_id === doc.id);
      const availableFrom = firstSchedule
        ? new Date(firstSchedule.date).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "غير محدد";

      const card = document.createElement("div");
      card.classList.add("doctor-card");
      card.innerHTML = `
        <img src="${doc.photo || "img/default-doctor.png"}" alt="دكتور ${doc["doc_name"]}">
        <h3>د / ${doc["doc_name"]}</h3>
        <p><i class="fa-regular fa-clock"></i> متاح اليوم من الساعة ${availableFrom}</p>
        <button onclick="window.location.href='booking.html?doctor_id=${doc.id}'">احجز الآن</button>
      `;
      availableDoctorsList.appendChild(card);

      // Animation بسيطة
      setTimeout(() => card.classList.add("show"), 100 * index);
    });
  });
});
