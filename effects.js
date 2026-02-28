const EFFECT_DATA = [
    // --- หมวด: ทำลายล้างเฉพาะทาง (Targeted Damage) ---
    { id: "eff_01", name: "Penicillin (เพนิซิลลิน)", type: "Human", power: 3, desc: "ยาปฏิชีวนะ: โจมตีการ์ด Monera ของบอท 1 ใบ (3 dmg)", action: "damage_bot_monera" },
    { id: "eff_02", name: "Chlorine Drop (คลอรีนฆ่าเชื้อ)", type: "Human", power: 3, desc: "คลอรีนฆ่าโพรทิสต์: โจมตีการ์ด Protista ของบอท 1 ใบ (3 dmg)", action: "damage_bot_protista" },
    { id: "eff_03", name: "Fungicide (ยาฆ่าเชื้อรา)", type: "Human", power: 3, desc: "สารเคมีหยุดสปอร์: โจมตีการ์ด Fungi ของบอท 1 ใบ (3 dmg)", action: "damage_bot_fungi" },
    { id: "eff_04", name: "Deforestation (ตัดไม้ทำลายป่า)", type: "Human", power: 3, desc: "ทำลายถิ่นที่อยู่: โจมตีการ์ด Plantae ของบอท 1 ใบ (3 dmg)", action: "damage_bot_plantae" },
    { id: "eff_05", name: "Poaching (ล่าสัตว์เถื่อน)", type: "Human", power: 3, desc: "ล่าผิดกฎหมาย: โจมตีการ์ด Animalia ของบอท 1 ใบ (3 dmg)", action: "damage_bot_animalia" },

    // --- หมวด: เพิ่ม AP (Resource Generation — ขั้นต่ำ 2 AP ทุกใบ) ---
    { id: "eff_06", name: "ATP Synthesis (สร้าง ATP)", type: "Biology", power: 0, desc: "พลังงานระดับเซลล์: ฟื้นฟู +2 AP ทันที", action: "gain_ap_2" },
    { id: "eff_07", name: "Photosynthesis Surge (สังเคราะห์แสง)", type: "Nature", power: 0, desc: "แสงแดดจ้า: ฟื้นฟู +2 AP ทันที", action: "gain_ap_2" },
    { id: "eff_08", name: "Rapid Evolution (วิวัฒนาการฉับพลัน)", type: "Evolution", power: 0, desc: "กลายพันธุ์เหมาะสิ่งแวดล้อม: ฟื้นฟู +3 AP ทันที", action: "gain_ap_3" },
    { id: "eff_09", name: "Symbiosis (ภาวะพึ่งพาอาศัย)", type: "Nature", power: 0, desc: "สองฝ่ายได้ประโยชน์ร่วม: ฟื้นฟู +2 AP ทันที", action: "gain_ap_2" },

    // --- หมวด: ภัยพิบัติแบบสุ่ม ---
    { id: "eff_10", name: "Meteor Strike (อุกกาบาตล้างโลก)", type: "Abiotic", power: 4, desc: "ภัยพิบัติสูญพันธุ์: โจมตีการ์ดบอทสุ่ม 1 ใบ (4 dmg)", action: "damage_bot_random" },
    { id: "eff_11", name: "Wildfire (ไฟป่ามรณะ)", type: "Abiotic", power: 3, desc: "เปลวเพลิงไร้ปรานี: โจมตีการ์ด Plantae ของบอททุกใบ (3 dmg)", action: "damage_all_plantae" },
    { id: "eff_12", name: "Climate Change (เปลี่ยนแปลงภูมิอากาศ)", type: "Abiotic", power: 3, desc: "อุณหภูมิผันผวน: โจมตีการ์ดบอทสุ่ม 1 ใบ (3 dmg)", action: "damage_bot_random" },
    { id: "eff_13", name: "Toxic Algal Bloom (ขี้ปลาวาฬ)", type: "Nature", power: 3, desc: "สาหร่ายพิษบูม: โจมตีการ์ดบอทสุ่ม 1 ใบ (3 dmg)", action: "damage_bot_random" },
    { id: "eff_14", name: "Invasive Species (ชนิดพันธุ์ต่างถิ่น)", type: "Nature", power: 3, desc: "สิ่งมีชีวิตต่างถิ่นรุกราน: โจมตีการ์ดบอทสุ่ม 1 ใบ (3 dmg)", action: "damage_bot_random" },
    { id: "eff_15", name: "Broad-spectrum Antibiotic (ยาฆ่าเชื้อฤทธิ์กว้าง)", type: "Human", power: 3, desc: "ยาฆ่าเชื้อหลายชนิด: โจมตีการ์ดบอทสุ่ม 1 ใบ (3 dmg)", action: "damage_bot_random" },

    // --- หมวด: จั่วการ์ดเพิ่ม (Draw Cards) ---
    { id: "eff_16", name: "Fossil Record (บันทึกฟอสซิล)", type: "Evolution", power: 0, desc: "ค้นพบข้อมูลใหม่จากซากดึกดำบรรพ์: จั่วการ์ดสิ่งมีชีวิต 1 ใบ", action: "draw_org_1" },
    { id: "eff_17", name: "Natural Selection (คัดเลือกโดยธรรมชาติ)", type: "Evolution", power: 0, desc: "วิวัฒนาการเลือกสรรด้านแข็งแกร่ง: จั่วการ์ดสิ่งมีชีวิต 2 ใบ", action: "draw_org_2" },
    { id: "eff_18", name: "Genetic Drift (การเคลื่อนที่ของยีน)", type: "Biology", power: 0, desc: "ยีนสุ่มเกิดขึ้น: จั่วการ์ดเวทมนตร์ 1 ใบ", action: "draw_eff_1" },
    { id: "eff_19", name: "Horizontal Gene Transfer (ถ่ายโอนยีนแนวราบ)", type: "Biology", power: 0, desc: "แบคทีเรียถ่ายโอนยีนข้ามสายพันธุ์: จั่วการ์ดสิ่งมีชีวิต 1 + เวทมนตร์ 1", action: "draw_combo" },

    // --- หมวด: วางสิ่งมีชีวิตเพิ่มได้ ---
    { id: "eff_20", name: "Rapid Reproduction (สืบพันธุ์เร็ว)", type: "Nature", power: 0, desc: "การสืบพันธุ์ท่วมโลก: วางสิ่งมีชีวิตได้เพิ่มอีก 1 ตัวในเทิร์นนี้", action: "extra_org_play" },
    { id: "eff_21", name: "Mass Migration (การอพยพใหญ่)", type: "Nature", power: 0, desc: "สิ่งมีชีวิตอพยพเข้ามาตั้งรกราก: วางได้เพิ่ม 1 ตัว + จั่ว 1 ใบ", action: "extra_org_and_draw" },
    { id: "eff_22", name: "Colony Spread (อาณานิคมขยายตัว)", type: "Biology", power: 0, desc: "แบคทีเรียแบ่งตัวอย่างรวดเร็ว: วางได้เพิ่ม 1 ตัว + จั่วสิ่งมีชีวิต 1 ใบ", action: "extra_org_and_draw" },
    { id: "eff_23", name: "Colonization Wave (คลื่นอาณาจักร)", type: "Evolution", power: 0, desc: "วิวัฒนาการรวดเร็ว ขยายอาณาเขต: วางสิ่งมีชีวิตได้เพิ่ม 1 ตัว", action: "extra_org_play" },
    { id: "eff_24", name: "Spore Burst (ปล่อยสปอร์)", type: "Nature", power: 0, desc: "เชื้อราปล่อยสปอร์ฟุ้งกระจาย: จั่วสิ่งมีชีวิต 2 ใบ + วางได้เพิ่ม 1 ตัว", action: "extra_org_draw2" }
];
