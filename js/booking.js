console.log("🔥 JS FILE LOADED");

document.addEventListener("DOMContentLoaded", async function () {
  // ================= عناصر الصفحة =================
  const doctorName = document.getElementById("doctor-name");
  const doctorSpecialty = document.getElementById("doctor-specialty");
  const doctorTitle = document.getElementById("doctor-title");
  const timesContainer = document.getElementById("available-times");
  const form = document.querySelector(".booking-form");
  const message = document.getElementById("message");
  const savedPhone = localStorage.getItem("user_phone");

  if (savedPhone) {
    document.getElementById("phone").value = savedPhone;
  }

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
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data: slots, error } = await mysupabase
    .from("doctor_availability")
    .select("*")
    .eq("doc_id", doctorId)
    .gte("date", startOfDay.toISOString())
    .lte("date", endOfDay.toISOString()); // ✅ للتأكد من البيانات القادمة

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
    if (!selectedSlotId) {
      btn.classList.add("selected");
      selectedSlotId = slot.slot_id;
      selectedSlotData = slot;
    }
  }

  if (!hasAvailable) {
    message.innerHTML = `<p>نأسف .. تم أكتمال حالات الكشف</p>`;
    form.style.display = "none";
  }

  console.log("toast:", document.getElementById("toast"));
  console.log("text:", document.getElementById("toast-text"));

  // ======  جلب اسماء الشركات التعاقدات=======
  async function loadContracts() {
    const { data, error } = await mysupabase
      .from("contracts")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error loading contracts:", error);
      return;
    }

    const group = document.getElementById("contracts-group");

    // تفريغ القديم لو فيه
    group.innerHTML = "";

    data.forEach((contract) => {
      const option = document.createElement("option");
      option.value = contract.id; // مهم نخلي القيمة id
      option.textContent = contract.name;

      group.appendChild(option);
    });
  }
  loadContracts();

  // ================= Modal =================

  function showBookingModal(data) {
    const modal = document.getElementById("booking-modal");

    document.getElementById("modal-doctor").textContent =
      "👨‍⚕️ الدكتور: " + data.doctor;

    // document.getElementById("modal-date").textContent =
    //   "📅 " + data.date + " - " + data.time;

    document.getElementById("modal-queue").textContent =
      "🔢 رقمك في الدور: " + data.queue;

    modal.classList.add("show");

    // زرار تم
    document.getElementById("modal-ok").onclick = () => {
      window.location.href = `index.html`;
    };

    // زرار X
    // document.querySelector(".close-modal").onclick = () => {
    //   modal.classList.remove("show");
    // };
  }
  function showToast(msg) {
    const div = document.createElement("div");
    div.innerText = msg;

    div.style.position = "fixed";
    div.style.bottom = "15px";
    div.style.left = "50%";
    div.style.transform = "translateX(-50%)";
    div.style.background = "#fff";
    div.style.color = "#e20004";
    div.style.padding = "10px 20px";
    div.style.borderRadius = "8px";
    div.style.zIndex = "999999";

    document.body.appendChild(div);

    setTimeout(() => div.remove(), 2000);
  }
  // ================= الحجز =================
  let isSubmitting = false;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (isSubmitting) return; // 🔒 يمنع الدوسة التانية
    isSubmitting = true;

    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "جاري الحجز...";
    }

    try {
      if (!selectedSlotId || !selectedSlotData) {
        alert("اختار ميعاد الأول");
        return;
      }

      const patientName = document.getElementById("patient-name").value.trim();
      const patientPhone = document.getElementById("phone").value.trim();
      const paymentmethod = document.getElementById("payment").value.trim();

      let contractId = null;
      let paymentType = "cash";

      if (paymentmethod !== "cash") {
        contractId = paymentmethod;
        paymentType = "contract";
      }

      if (!patientName || !patientPhone) {
        alert("من فضلك املأ البيانات");
        return;
      }

      const { data: existing } = await mysupabase
        .from("bookings")
        .select("id")
        .eq("slot_id", selectedSlotId)
        .eq("patient_phone", patientPhone)
        .eq("patient_name", patientName)
        .in("status", ["attended", "confirmed"]);

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

      // حساب عدد الطابور
      // const { count: queueCount } = await mysupabase
      //   .from("bookings")
      //   .select("*", { count: "exact", head: true })
      //   .eq("slot_id", selectedSlotId)
      //   .in("type", ["walk_in", "online"])
      //   .in("status", ["confirmed", "attended"]);

      const { error: insertError } = await mysupabase
        .from("bookings")
        .insert([
          {
            doctor_id: doctorId,
            slot_id: selectedSlotId,
            patient_name: patientName,
            patient_phone: patientPhone,
            contract_id: contractId,
            payment_method: paymentType,
            status: "confirmed",
            type: "online",
            priority: 2,
            // queue_num: queueCount + 1,
          },
        ])
        .select();
      
      const insertedBooking = data[0]; // 👈 ده اللي كان ناقصك

      if (insertError) {
        console.error(insertError);
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

      showBookingModal({
        doctor: doctor["doc_name"],
        date: formattedDate,
        time: formattedTime,
        queue: insertedBooking.queue_num // ✅ الرقم الحقيقي

        // queue: queueCount + 1,
      });

      form.reset();

      console.log(
        "Slots raw:",
        slots.map((s) => ({
          slot_id: s.slot_id,
          date: s.date,
          has_available: s.has_available,
        })),
      );
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      // 🔓 دي أهم نقطة
      isSubmitting = false;

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "احجز";
      }
    }
  });
});
