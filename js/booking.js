console.log("🔥 JS FILE LOADED");
document.addEventListener("DOMContentLoaded", async function () {
  // ================= عناصر الصفحة =================
  const doctorName = document.getElementById("doctor-name");
  const doctorSpecialty = document.getElementById("doctor-specialty");
  const doctorTitle = document.getElementById("doctor-title");
  const timesContainer = document.getElementById("available-times");
  const form = document.querySelector(".booking-form");
  const message = document.getElementById("message");

  let selectedSlotId = null;
  let selectedSlotData = null;

  // ================= Supabase =================
  const supabaseUrl = "https://rfwylqnkkaxaapinapaz.supabase.co";
  const supabaseKey = "sb_publishable_xfBrhWGol1KRKURhE_5a6w_Mm6iSLUj";
  const mysupabase = supabase.createClient(supabaseUrl, supabaseKey);

  // ================= doctor_id من اللينك =================
  const params = new URLSearchParams(window.location.search);
  const doctorId = params.get("doctor_id");

  if (!doctorId || doctorId === "اختر الطبيب") {
    alert("يجب أختيار الطبيب أولا");
    window.location.href = "index.html";
    return;
  }

  // ================= 1️⃣ بيانات الدكتور =================
  const { data: doctor, error: docError } = await mysupabase
    .from("doctors")
    .select(
      `
      id,
      doc_name,
      doc_title,
      specialties (
        spcial_name
      )
    `,
    )
    .eq("id", doctorId)
    .single();

  if (docError) {
    console.error(docError);
    return;
  }

  doctorName.textContent = "د . " + doctor["doc_name"];
  doctorTitle.textContent = doctor["doc_title"];
  doctorSpecialty.textContent = "التخصص: " + doctor.specialties["spcial_name"];

  const { data: schedules, error: schError } = await mysupabase
    .from("doc_schedual")
    .select("*")
    .eq("doc_id", doctorId);

  if (schError) {
    console.error(schError);
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const validSchedules = schedules.filter((s) => {
    if (!s.date) return false;
    const scheduleDate = new Date(s.date);
    return scheduleDate >= today;
  });

  timesContainer.innerHTML = "";

  if (!validSchedules || validSchedules.length === 0) {
    message.innerHTML = `<p>لا توجد مواعيد متاحة حالياً</p>`;
    form.style.display = "none";
    return;
  }

  // ================= عرض المواعيد =================
  let hasAvailable = false;

  for (const slot of validSchedules) {
    const { count } = await mysupabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("slot_id", slot.id)
      .in("status", ["confirmed", "attended"]);

    //======== تخطي المواعيد المكتملة فقط======
    if (slot.max_patients && count >= slot.max_patients) continue;

    hasAvailable = true;

    const btn = document.createElement("button");
    btn.type = "button";

    const dateObj = new Date(slot.date);

    const formattedDate = dateObj.toLocaleDateString("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const formattedTime = dateObj.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });

    btn.textContent = `${formattedDate} - ${formattedTime}`;

    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".available-times button")
        .forEach((b) => b.classList.remove("selected"));

      btn.classList.add("selected");
      selectedSlotId = slot.id;
      selectedSlotData = slot;
    });

    timesContainer.appendChild(btn);
  }

  if (!hasAvailable) {
    message.innerHTML = `<p>نأسف .. تم أكتمال حالات الكشف</p>`;
    form.style.display = "none";
  }
  // ========تخزين حاله hasAvaliable LOCAL==========

  let storedDoctors =
    JSON.parse(localStorage.getItem("doctorsAvailability")) || [];

  // شيل القديم لنفس الدكتور
  storedDoctors = storedDoctors.filter((d) => d.id !== doctorId);

  // ضيف الجديد
  storedDoctors.push({
    id: doctorId,
    hasAvailable: hasAvailable,
  });

  // خزّن تاني
  localStorage.setItem("doctorsAvailability", JSON.stringify(storedDoctors));
  // ================= Toast =================
  function showToast(text, type = "success") {
    const toast = document.getElementById("toast");

    toast.textContent = text;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
  console.log("Saved:", storedDoctors);
  // ================= 3️⃣ الحجز =================
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!selectedSlotId || !selectedSlotData) {
      alert("اختار ميعاد الأول");
      return;
    }

    // 🟢 بيانات الفورم
    const patientName = document.getElementById("patient-name").value.trim();
    const patientPhone = document.getElementById("phone").value.trim();
    const paymentmethod = document.getElementById("payment").value.trim();

    if (!patientName || !patientPhone) {
      alert("من فضلك املأ البيانات");
      return;
    }

    // 🟢 منع التكرار
    const { data: existing } = await mysupabase
      .from("bookings")
      .select("id")
      .eq("slot_id", selectedSlotId)
      .eq("patient_phone", patientPhone)
      .in("status", ["pending", "confirmed"]);

    if (existing.length > 0) {
      alert("حجزت نفس الميعاد قبل كده");
      return;
    }

    // 🟢 احسب العدد الحالي
    const { count } = await mysupabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("slot_id", selectedSlotId)
      .in("status", ["confirmed", "attended"]);

    // 🟢 check max
    if (
      selectedSlotData.max_patients &&
      count >= selectedSlotData.max_patients
    ) {
      alert("الموعد اكتمل");
      return;
    }

    // 🟢 insert booking
    const { error: insertError } = await mysupabase.from("bookings").insert([
      {
        doctor_id: doctorId,
        slot_id: selectedSlotId,
        patient_name: patientName,
        patient_phone: patientPhone,
        contract: paymentmethod,
        status: "pending",
      },
    ]);

    if (insertError) {
      console.error(insertError);
      showToast("فشل الحجز", "error");
      return;
    }

    // 🟢 format date/time
    const dateObj = new Date(selectedSlotData.date);

    const formattedDate = dateObj.toLocaleDateString("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const formattedTime = dateObj.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // 🟢 نجاح
    showToast(`تم الحجز ✅ ${formattedDate} - ${formattedTime}`);

    form.reset();

    setTimeout(() => {
      window.location.href = `booking.html?doctor_id=${doctorId}`;
    }, 1500);
  });
});
