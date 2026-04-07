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

  // ================= بيانات الدكتور =================
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

  // ================= جلب المواعيد من ال view =================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: slots, error } = await mysupabase
    .from("doctor_availability")
    .select("*")
    .eq("doc_id", doctorId)
    .gte("date", today.toISOString()); // ✅ للتأكد من البيانات القادمة

  if (error) {
    console.error(error);
    message.innerHTML = `<p>حدث خطأ في تحميل المواعيد</p>`;
    form.style.display = "none";
    return;
  }

  if (!slots || slots.length === 0) {
    message.innerHTML = `<p>لا توجد مواعيد متاحة حالياً</p>`;
    form.style.display = "none";
    return;
  }

  let hasAvailable = false;

  for (const slot of slots) {
    // تحويل has_available إلى Boolean صريح
    const available =
      Boolean(slot.has_available) && slot.has_available !== "false";

    const slotDate = new Date(slot.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!available || slotDate < today) continue;

    hasAvailable = true;

    const btn = document.createElement("button");
    btn.type = "button";

    const formattedDate = slotDate.toLocaleDateString("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const formattedTime = slotDate.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });

    btn.textContent = `${formattedDate} - ${formattedTime}`;

    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".available-times button")
        .forEach((b) => b.classList.remove("selected"));

      btn.classList.add("selected");
      selectedSlotId = slot.slot_id;
      selectedSlotData = slot;
    });

    timesContainer.appendChild(btn);
  }

  if (!hasAvailable) {
    message.innerHTML = `<p>نأسف .. تم أكتمال حالات الكشف</p>`;
    form.style.display = "none";
  }

  // ================= Toast =================
  function showToast(text, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // ================= الحجز =================
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!selectedSlotId || !selectedSlotData) {
      alert("اختار ميعاد الأول");
      return;
    }

    const patientName = document.getElementById("patient-name").value.trim();
    const patientPhone = document.getElementById("phone").value.trim();
    const paymentmethod = document.getElementById("payment").value.trim();

    if (!patientName || !patientPhone) {
      alert("من فضلك املأ البيانات");
      return;
    }

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

    const { count } = await mysupabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("slot_id", selectedSlotId)
      .in("status", ["confirmed", "attended"]);

    if (
      selectedSlotData.max_patients &&
      count >= selectedSlotData.max_patients
    ) {
      alert("الموعد اكتمل");
      return;
    }

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

    showToast(`تم الحجز ✅ ${formattedDate} - ${formattedTime}`);
    form.reset();
    console.log(
      "Slots raw:",
      slots.map((s) => ({
        slot_id: s.slot_id,
        date: s.date,
        has_available: s.has_available,
      })),
    );
    setTimeout(() => {
      window.location.href = `booking.html?doctor_id=${doctorId}`;
    }, 1500);
  });
});
