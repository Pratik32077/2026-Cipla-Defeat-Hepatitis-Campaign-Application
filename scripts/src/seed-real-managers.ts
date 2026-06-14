import { db, managersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DEFAULT_PASSWORD = "Cipla@1234";

const managers = [
  // Ahmedabad
  { region: "Ahmedabad", employeeCode: "154173", headquarters: "Ahmedabad", name: "Harshkumar Patel", email: "harshkumar.patel@Cipla.com", mobile: "8238482515" },
  { region: "Ahmedabad", employeeCode: "161183", headquarters: "Baroda", name: "Vishal Pratap Singh", email: "vishal.singh16@Cipla.com", mobile: "8737910592" },
  { region: "Ahmedabad", employeeCode: "170590", headquarters: "Thane Central", name: "Sagar Tiwari", email: "sagar.tiwari@Cipla.com", mobile: "9702782205" },
  { region: "Ahmedabad", employeeCode: "155913", headquarters: "Ahmedabad", name: "Patel Ravikumar Mahendrabhai", email: "ravi.patel2@Cipla.com", mobile: "9302809259" },
  { region: "Ahmedabad", employeeCode: "167381", headquarters: "Rajkot", name: "Pradip PARMAR Parmar", email: "pradip.parmar@Cipla.com", mobile: "9328062563" },
  { region: "Ahmedabad", employeeCode: "169428", headquarters: "Ahmedabad", name: "Akhilesh Singh", email: "akhilesh.singh1@Cipla.com", mobile: "9598151002" },
  // Mumbai
  { region: "Mumbai", employeeCode: "177542", headquarters: "Navi Mumbai", name: "Tejas Dinkar More", email: "tejas.more2@Cipla.com", mobile: "8668458093" },
  { region: "Mumbai", employeeCode: "170937", headquarters: "Mumbai West", name: "Shefali Jignesh Patel", email: "shefali.patel@Cipla.com", mobile: "9167526865" },
  { region: "Mumbai", employeeCode: "176798", headquarters: "Mumbai South", name: "Asjad Sajid Ahmed Choudhary", email: "asjad.choudhary@Cipla.com", mobile: "7977345488" },
  { region: "Mumbai", employeeCode: "173088", headquarters: "Mumbai South", name: "Afzal Abdulkalam Khan", email: "afzal.khan@Cipla.com", mobile: "9372657091" },
  // Indore
  { region: "Indore", employeeCode: "176609", headquarters: "Jaipur", name: "Abdul Rehman", email: "abdul.rehman@Cipla.com", mobile: "7906362882" },
  { region: "Indore", employeeCode: "154812", headquarters: "Jaipur", name: "Deepak Tiwari", email: "deepak.tiwari@Cipla.com", mobile: "9098302384" },
  { region: "Indore", employeeCode: "159607", headquarters: "Raipur", name: "Sachin Kumbhkar", email: "sachin.kumbhkar@Cipla.com", mobile: "7580980222" },
  { region: "Indore", employeeCode: "163489", headquarters: "Jaipur", name: "Jitendra Kumar Saini", email: "jitendra.saini1@Cipla.com", mobile: "6377135510" },
  { region: "Indore", employeeCode: "177936", headquarters: "Indore", name: "Yogesh Patil 2", email: "yogesh.patil22@Cipla.com", mobile: "8319245327" },
  { region: "Indore", employeeCode: "164598", headquarters: "Bhopal", name: "Ranu Patel", email: "ranu.patel@Cipla.com", mobile: "9131009432" },
  // Pune
  { region: "Pune", employeeCode: "173643", headquarters: "Pune", name: "Urmila Vishwambar Anande", email: "urmilavishwambar.ana@Cipla.com", mobile: "9370372040" },
  { region: "Pune", employeeCode: "169635", headquarters: "Aurangabad", name: "Pavan Ganesh Padol", email: "pavan.padol@Cipla.com", mobile: "9623102680" },
  { region: "Pune", employeeCode: "172598", headquarters: "Nagpur", name: "Swapnil Ashok Tiple", email: "swapnil.tiple@Cipla.com", mobile: "9766327136" },
  { region: "Pune", employeeCode: "162327", headquarters: "Pune", name: "Pushpendra Kumar Rajak", email: "pushpendrakumar.raj@Cipla.com", mobile: "9595109224" },
  { region: "Pune", employeeCode: "169776", headquarters: "Nasik", name: "Chandrashekhar Subhash Chaudhari", email: "chandrashekhar.chaud@Cipla.com", mobile: "8698220434" },
  { region: "Pune", employeeCode: "170053", headquarters: "Nagpur", name: "Jaykisan Shyamrao Hedau", email: "jaykisan.hedau@Cipla.com", mobile: "8999981862" },
  // Delhi
  { region: "Delhi", employeeCode: "117910", headquarters: "East Delhi", name: "Lov Kumar Kunal", email: "Lovkumar.Kunal@Cipla.com", mobile: "9313679993" },
  { region: "Delhi", employeeCode: "153254", headquarters: "Hissar", name: "Samir Kumar", email: "Samir.Kumar1@Cipla.com", mobile: "8295082393" },
  { region: "Delhi", employeeCode: "145442", headquarters: "South Delhi", name: "Peeyush Mishra", email: "peeyush.mishra@Cipla.com", mobile: "8873039100" },
  { region: "Delhi", employeeCode: "167078", headquarters: "Meerut", name: "Kumar Mahesh Prajapati", email: "mahesh.prajapati@Cipla.com", mobile: "7408233488" },
  // Ambala/Haryana
  { region: "Ambala/Haryana", employeeCode: "168378", headquarters: "Faridabad", name: "Keshav Kumar Tiwari", email: "keshav.tiwari@Cipla.com", mobile: "7773520851" },
  { region: "Ambala/Haryana", employeeCode: "167074", headquarters: "Gurgaon", name: "Sonu J", email: "sonu.j@Cipla.com", mobile: "9053101651" },
  // Ghaziabad
  { region: "Ghaziabad", employeeCode: "109086", headquarters: "Varanasi", name: "Sudhir Verma", email: "sudhir.verma1@Cipla.com", mobile: "9305085593" },
  { region: "Ghaziabad", employeeCode: "155754", headquarters: "Lucknow", name: "Rajguru Tiwari", email: "rajguru.tiwari@Cipla.com", mobile: "8887760433" },
  { region: "Ghaziabad", employeeCode: "151850", headquarters: "Lucknow", name: "Manish Kumar", email: "manish.kumar24@Cipla.com", mobile: "6386561966" },
  { region: "Ghaziabad", employeeCode: "118468", headquarters: "Rudrapur", name: "Kalwant Singh", email: "Kalwant.Singh@Cipla.com", mobile: "8279415363" },
  { region: "Ghaziabad", employeeCode: "177939", headquarters: "Kanpur", name: "Rishabh Gupta", email: "rishabh.gupta@Cipla.com", mobile: "7905636399" },
  { region: "Ghaziabad", employeeCode: "160644", headquarters: "Agra", name: "Nimisha A", email: "nimisha.a@Cipla.com", mobile: "9453519000" },
  { region: "Ghaziabad", employeeCode: "170055", headquarters: "Ghaziabad", name: "Shivam Verma", email: "shivam.verma2@Cipla.com", mobile: "9027459020" },
  { region: "Ghaziabad", employeeCode: "166912", headquarters: "Ghaziabad", name: "Aman Saxena", email: "aman.saxena@Cipla.com", mobile: "7500090435" },
  { region: "Ghaziabad", employeeCode: "162357", headquarters: "Meerut", name: "Naveen Kumar", email: "naveen.kumar30@Cipla.com", mobile: "9783023421" },
  { region: "Ghaziabad", employeeCode: "148599", headquarters: "Bareilly", name: "Ram Varan", email: "ram.varan@Cipla.com", mobile: "8881758801" },
  // Bihar
  { region: "Bihar", employeeCode: "174497", headquarters: "Patna", name: "Surya Bhushan Upadhyay", email: "surya.upadhyay@Cipla.com", mobile: "6203617102" },
  { region: "Bihar", employeeCode: "138754", headquarters: "Patna", name: "Jitender Kumar Singh", email: "Jitender.Singh1@Cipla.com", mobile: "7484917666" },
  { region: "Bihar", employeeCode: "131894", headquarters: "Patna", name: "Rajesh Ranjan", email: "Rajesh.ranjan@Cipla.com", mobile: "9308710901" },
  { region: "Bihar", employeeCode: "163424", headquarters: "Purnia", name: "Kunal Kumar 4", email: "kunal.kumar4@Cipla.com", mobile: "9835006028" },
  { region: "Bihar", employeeCode: "176185", headquarters: "Cuttack", name: "Sarthak Swarup", email: "sarthak.swarup@Cipla.com", mobile: "9437307442" },
  { region: "Bihar", employeeCode: "159625", headquarters: "Cuttack", name: "Boby Dayal Rao", email: "boby.rao@Cipla.com", mobile: "9348206370" },
  { region: "Bihar", employeeCode: "173833", headquarters: "Ranchi", name: "Pradip Kumar Das", email: "pradip.das@Cipla.com", mobile: "8789205380" },
  // Kolkata
  { region: "Kolkata", employeeCode: "174501", headquarters: "Lehariaasarai", name: "Vikash Kumar", email: "vikash.kumar21@Cipla.com", mobile: "8862881317" },
  { region: "Kolkata", employeeCode: "168637", headquarters: "Guwahati", name: "Surajit Bezbaruah", email: "surajit.bezbaruah@Cipla.com", mobile: "7002087016" },
  { region: "Kolkata", employeeCode: "176625", headquarters: "Kolkata", name: "Indraneel Sarkar", email: "indraneel.sarkar@Cipla.com", mobile: "7980028625" },
  { region: "Kolkata", employeeCode: "159205", headquarters: "Kolkata", name: "Oendrila Dhara", email: "oendrila.dhara@Cipla.com", mobile: "7439082292" },
  { region: "Kolkata", employeeCode: "171399", headquarters: "Guwahati Taluka", name: "Bikash Talukdar", email: "bikash.talukdar@Cipla.com", mobile: "9902027083" },
  { region: "Kolkata", employeeCode: "166524", headquarters: "Kolkata", name: "Shilajit Saha", email: "shilajit.saha@Cipla.com", mobile: "9875608388" },
  // Ludhiana
  { region: "Ludhiana", employeeCode: "175269", headquarters: "Amritsar", name: "Sushant Saini", email: "sushant.saini@Cipla.com", mobile: "9541491221" },
  { region: "Ludhiana", employeeCode: "167939", headquarters: "Chandigarh", name: "Abhishek Kapoor", email: "abhishek.kapoor@Cipla.com", mobile: "8727960204" },
  { region: "Ludhiana", employeeCode: "177688", headquarters: "Chandigarh", name: "Abhishek Sharma", email: "abhishek.sharma23@Cipla.com", mobile: "9805854475" },
  { region: "Ludhiana", employeeCode: "172154", headquarters: "Jammu", name: "Anirudh Sharma", email: "anirudh.sharma1@Cipla.com", mobile: "7006514508" },
  { region: "Ludhiana", employeeCode: "176178", headquarters: "Ludhiana", name: "Suraj Kumar Singh", email: "suraj.singh9@Cipla.com", mobile: "9653357020" },
  // Hyderabad
  { region: "Hyderabad", employeeCode: "170444", headquarters: "Hyderabad Central", name: "B Jaipali", email: "b.jaipali@Cipla.com", mobile: "9052833190" },
  { region: "Hyderabad", employeeCode: "166898", headquarters: "Vijayawada", name: "Gattem Venkata Saikrishna", email: "gattem.venkatasaikri@Cipla.com", mobile: "8885179169" },
  { region: "Hyderabad", employeeCode: "167811", headquarters: "Hyderabad", name: "Kurra Anil Kumar", email: "kurra.anilkumar@Cipla.com", mobile: "9505093464" },
  { region: "Hyderabad", employeeCode: "166772", headquarters: "Kurnool", name: "Chakali Vikram Maha Raj", email: "chakali.vikrammahara@Cipla.com", mobile: "9502445307" },
  { region: "Hyderabad", employeeCode: "167129", headquarters: "Hyderabad", name: "Ettadi Karunakar Reddy", email: "ettadi.karunakaredd@Cipla.com", mobile: "9347674430" },
  { region: "Hyderabad", employeeCode: "145370", headquarters: "Vijayawada", name: "Mohammed Javed", email: "mohammed.javed@Cipla.com", mobile: "7396956313" },
  { region: "Hyderabad", employeeCode: "171443", headquarters: "Vizag", name: "Kosireddi Nageswara Rao", email: "kosireddi.rao@Cipla.com", mobile: "8179874023" },
  // Bangalore
  { region: "Bangalore", employeeCode: "153797", headquarters: "Hubli", name: "Abbutalib Abdulrazaknawar", email: "abbutalib.abdulrazak@Cipla.com", mobile: "7899304701" },
  { region: "Bangalore", employeeCode: "155977", headquarters: "Sagar", name: "Sagar K", email: "sagar.k@Cipla.com", mobile: "9857613834" },
  { region: "Bangalore", employeeCode: "172169", headquarters: "Bangalore", name: "Md Swael Uddin", email: "md.uddin1@Cipla.com", mobile: "8974145086" },
  { region: "Bangalore", employeeCode: "172417", headquarters: "Bangalore", name: "Shivakumara T", email: "shivakumar.1@Cipla.com", mobile: "9353463544" },
  { region: "Bangalore", employeeCode: "166625", headquarters: "Bangalore", name: "T Ashok Kumar", email: "t.ashokumar@Cipla.com", mobile: "9381955585" },
  { region: "Bangalore", employeeCode: "154185", headquarters: "Bangalore", name: "G Sathish", email: "g.sathish@Cipla.com", mobile: "9493831846" },
  { region: "Bangalore", employeeCode: "167359", headquarters: "Davangere", name: "Bharath Kumar C S", email: "bharath.kumarcs@Cipla.com", mobile: "8660171538" },
  // Chennai
  { region: "Chennai", employeeCode: "167871", headquarters: "Chennai", name: "Thangapandi S", email: "thangapandi.s@Cipla.com", mobile: "9843245525" },
  { region: "Chennai", employeeCode: "161167", headquarters: "South Chennai", name: "N Vasanth Kumar", email: "n.vasanthkumar@Cipla.com", mobile: "8608716844" },
  { region: "Chennai", employeeCode: "166786", headquarters: "Salem", name: "Subara Venkatachalalam", email: "subara.venkatachalac@Cipla.com", mobile: "8056395349" },
  { region: "Chennai", employeeCode: "159284", headquarters: "Coimbatore", name: "Shanmugam Kannan", email: "shanmugam.kannan@Cipla.com", mobile: "8098909002" },
  { region: "Chennai", employeeCode: "158458", headquarters: "Chennai", name: "Shuaib PL", email: "shuaib.liyakathali@Cipla.com", mobile: "7358102620" },
  { region: "Chennai", employeeCode: "153514", headquarters: "Madurai", name: "Mathan Pannerselvam", email: "mathan.pannerselvam@Cipla.com", mobile: "9042531875" },
  { region: "Chennai", employeeCode: "147696", headquarters: "North Chennai", name: "Barathirajan M", email: "barathirajan.m@Cipla.com", mobile: "8940993172" },
  // Cochin
  { region: "Cochin", employeeCode: "173861", headquarters: "Kottayam", name: "Vishnu M Nair", email: "vishnu.nair2@Cipla.com", mobile: "8129294823" },
  { region: "Cochin", employeeCode: "174510", headquarters: "Cochin", name: "Muhammed Shafi PA", email: "muhammedshafi.pa@Cipla.com", mobile: "9526997255" },
  { region: "Cochin", employeeCode: "166466", headquarters: "Mangalore", name: "Rishna PK", email: "drisha.pk@Cipla.com", mobile: "9956354958" },
  { region: "Cochin", employeeCode: "161688", headquarters: "Trivandrum", name: "Chandra Prakash", email: "chandru.prakash@Cipla.com", mobile: "9544628614" },
  { region: "Cochin", employeeCode: "166821", headquarters: "Calicut", name: "Abhishek Vijay B", email: "abhishek.vijayb@Cipla.com", mobile: "8589808266" },
];

async function main() {
  console.log(`Seeding ${managers.length} real managers...`);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let inserted = 0;
  let skipped = 0;

  for (const m of managers) {
    const existing = await db.select({ id: managersTable.id })
      .from(managersTable)
      .where(eq(managersTable.employeeCode, m.employeeCode))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  SKIP (already exists): ${m.employeeCode} — ${m.name}`);
      skipped++;
      continue;
    }

    await db.insert(managersTable).values({
      name: m.name,
      employeeCode: m.employeeCode,
      email: m.email,
      mobile: m.mobile,
      region: m.region,
      headquarters: m.headquarters,
      username: m.employeeCode,
      passwordHash,
      isActive: true,
      targetDoctors: 84,
    });
    console.log(`  OK: ${m.employeeCode} — ${m.name} (${m.region})`);
    inserted++;
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
