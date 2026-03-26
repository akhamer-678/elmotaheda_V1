document.addEventListener("DOMContentLoaded", async function () {
  // ================= عناصر الصفحة =================
  const doctorName = document.getElementById("doctor-name");
  const doctorSpecialty = document.getElementById("doctor-specialty");
  const doctorTitle = document.getElementById("doctor-title");
  const timesContainer = document.getElementById("available-times");
  const form = document.querySelector(".booking-form");
  const message = document.getElementById("message");

  let selectedSlotId = null;

  // ================= Supabase =================
  const supabaseUrl = "https://rfwylqnkkaxaapinapaz.supabase.co";
  const supabaseKey = "sb_publishable_xfBrhWGol1KRKURhE_5a6w_Mm6iSLUj";
  const mysupabase = supabase.createClient(supabaseUrl, supabaseKey);

  // ================= doctor_id من اللينك =================
  const params = new URLSearchParams(window.location.search);
  const doctorId = params.get("doctor_id");

  if (!doctorId) {
    alert("اختار دكتور الأول");
    window.location.href = "main.html";
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

  // ================= 2️⃣ المواعيد =================
  const { data: schedules, error: schError } = await mysupabase
    .from("doc_schedual")
    .select("*")
    .eq("doc_id", doctorId);
  if (schError) {
    console.error(schError);
    return;
  }

  // تنظيف الكونتينر
  timesContainer.innerHTML = "";

  // لو مفيش مواعيد
  if (!schedules || schedules.length === 0) {
    message.innerHTML = `<p>لا توجد مواعيد متاحة حالياً</p>`;
    form.style.display = "none";
    return;
  }
  // ================= عرض المواعيد =================
  let hasAvailable = false;

  schedules.forEach((slot) => {
    if (slot.booked_count >= slot.max_patients) return;

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
    // اختيار الموعد
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".available-times button")
        .forEach((b) => b.classList.remove("selected"));

      btn.classList.add("selected");
      selectedSlotId = slot.id;
    });

    timesContainer.appendChild(btn);
  });

  // 🔥 لو مفيش ولا معاد متاح
  if (!hasAvailable) {
    message.innerHTML = `<p>لا توجد مواعيد متاحة حالياً</p>`;
    form.style.display = "none";
  }

  // ================= 3️⃣ الحجز =================
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!selectedSlotId) {
      alert("اختار ميعاد الأول");
      return;
    }

    // نجيب البيانات الحالية للموعد
    const { data: slotData } = await mysupabase
      .from("doc_schedual")
      .select("booked_count, max_patients")
      .eq("id", selectedSlotId)
      .single();

    if (slotData.booked_count >= slotData.max_patients) {
      alert("الموعد اكتمل، اختار ميعاد تاني");
      return;
    }

    // نحدث العدد
    const { error } = await mysupabase
      .from("doc_schedual")
      .update({
        booked_count: slotData.booked_count + 1,
      })
      .eq("id", selectedSlotId);

    if (error) {
      console.error(error);
      alert("حصل خطأ");
      return;
    }

    alert(`${formattedDate} - ${formattedTime} + تم الحجز بنجاح ✅`);

    window.location.href = `booking.html?doctor_id=${doctorId}`;
  });
});
