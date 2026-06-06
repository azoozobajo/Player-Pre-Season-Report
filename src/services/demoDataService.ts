import { supabase } from '../lib/supabase'

const DEMO_PROGRAM_NAME = 'البرنامج الإعدادي - موسم 2026'

const DEMO_PLAYERS = [
  { full_name: 'عبدالله العتيبي',    position: 'حارس مرمى', jersey_number: 1,  date_of_birth: '2002-03-15', nationality: 'سعودي', height_cm: 187, weight_kg: 80 },
  { full_name: 'وليد الرشيدي',       position: 'مدافع',      jersey_number: 2,  date_of_birth: '2001-07-22', nationality: 'سعودي', height_cm: 179, weight_kg: 74 },
  { full_name: 'عمر الحربي',         position: 'مدافع',      jersey_number: 3,  date_of_birth: '2003-01-10', nationality: 'سعودي', height_cm: 181, weight_kg: 77 },
  { full_name: 'محمد الغامدي',       position: 'مدافع',      jersey_number: 4,  date_of_birth: '2000-11-05', nationality: 'سعودي', height_cm: 180, weight_kg: 76 },
  { full_name: 'خالد الزهراني',      position: 'مدافع',      jersey_number: 5,  date_of_birth: '2002-08-18', nationality: 'سعودي', height_cm: 177, weight_kg: 73 },
  { full_name: 'فيصل القحطاني',      position: 'مدافع',      jersey_number: 6,  date_of_birth: '2001-12-01', nationality: 'سعودي', height_cm: 176, weight_kg: 72 },
  { full_name: 'أحمد الدوسري',       position: 'لاعب وسط',   jersey_number: 7,  date_of_birth: '2001-04-30', nationality: 'سعودي', height_cm: 174, weight_kg: 70 },
  { full_name: 'سلطان الشهري',       position: 'لاعب وسط',   jersey_number: 8,  date_of_birth: '2000-06-25', nationality: 'سعودي', height_cm: 176, weight_kg: 72 },
  { full_name: 'طارق المالكي',       position: 'مهاجم',      jersey_number: 9,  date_of_birth: '2001-12-08', nationality: 'سعودي', height_cm: 180, weight_kg: 75 },
  { full_name: 'يوسف البقمي',        position: 'لاعب وسط',   jersey_number: 10, date_of_birth: '2002-05-14', nationality: 'سعودي', height_cm: 173, weight_kg: 69 },
  { full_name: 'ناصر العنزي',        position: 'مهاجم',      jersey_number: 11, date_of_birth: '2000-02-28', nationality: 'سعودي', height_cm: 182, weight_kg: 77 },
  { full_name: 'عبدالرحمن الصبيعي', position: 'لاعب وسط',   jersey_number: 12, date_of_birth: '2003-09-12', nationality: 'سعودي', height_cm: 172, weight_kg: 68 },
  { full_name: 'علي الحمدان',        position: 'مهاجم',      jersey_number: 13, date_of_birth: '2000-07-15', nationality: 'سعودي', height_cm: 183, weight_kg: 79 },
  { full_name: 'إبراهيم الجهني',     position: 'مهاجم',      jersey_number: 14, date_of_birth: '2001-08-20', nationality: 'سعودي', height_cm: 178, weight_kg: 75 },
  { full_name: 'حسن المطيري',        position: 'لاعب وسط',   jersey_number: 16, date_of_birth: '2003-10-03', nationality: 'سعودي', height_cm: 171, weight_kg: 67 },
]

// Base quality factor per player (0.55 - 0.95) for realistic variance
const PLAYER_QUALITY = [0.80, 0.70, 0.75, 0.72, 0.68, 0.65, 0.85, 0.78, 0.90, 0.88, 0.82, 0.60, 0.76, 0.73, 0.62]

// Improvement rate per player per week (small variance)
const IMPROVEMENT = [0.035, 0.028, 0.030, 0.025, 0.032, 0.027, 0.040, 0.033, 0.038, 0.042, 0.036, 0.020, 0.031, 0.029, 0.022]

// Attendance probability per player (0 = sometimes absent, 1 = always present)
const ATTENDANCE_PROB = [0.95, 0.90, 0.85, 0.92, 0.88, 0.80, 0.98, 0.93, 0.95, 0.97, 0.90, 0.75, 0.88, 0.85, 0.78]

const DEMO_CATEGORIES = [
  { name: 'Physical', name_ar: 'البدني', color: '#e74c3c', sort_order: 1 },
  { name: 'Fitness', name_ar: 'اللياقي', color: '#16a085', sort_order: 2 },
  { name: 'Technical', name_ar: 'المهاري', color: '#3498db', sort_order: 3 },
  { name: 'Tactical', name_ar: 'التكتيكي', color: '#2ecc71', sort_order: 4 },
  { name: 'Mental', name_ar: 'الذهني', color: '#9b59b6', sort_order: 5 },
  { name: 'Medical', name_ar: 'الطبي', color: '#f39c12', sort_order: 6 },
]

// indicator: { name_ar, name, type, unit, direction, min_value, max_value, target_value, category_name, base_min, base_max }
const DEMO_INDICATORS = [
  // البدني
  { name_ar: 'السرعة 30م', name: 'Speed 30m', type: 'numeric', unit: 'ثانية', direction: 'lower_better', min_value: 3.0, max_value: 6.0, target_value: 4.0, category_name: 'Physical', base_min: 4.3, base_max: 5.2 },
  { name_ar: 'القفز العمودي', name: 'Vertical Jump', type: 'numeric', unit: 'سم', direction: 'higher_better', min_value: 20, max_value: 90, target_value: 65, category_name: 'Physical', base_min: 42, base_max: 65 },
  { name_ar: 'الرشاقة (T-Test)', name: 'Agility T-Test', type: 'numeric', unit: 'ثانية', direction: 'lower_better', min_value: 8, max_value: 15, target_value: 10, category_name: 'Physical', base_min: 11.0, base_max: 13.5 },
  // اللياقي
  { name_ar: 'القدرة الهوائية (VO2)', name: 'VO2 Max', type: 'numeric', unit: 'ml/kg/min', direction: 'higher_better', min_value: 30, max_value: 70, target_value: 56, category_name: 'Fitness', base_min: 38, base_max: 54 },
  { name_ar: 'جري 6 دقائق', name: '6min Run', type: 'numeric', unit: 'متر', direction: 'higher_better', min_value: 800, max_value: 1800, target_value: 1500, category_name: 'Fitness', base_min: 1050, base_max: 1380 },
  { name_ar: 'الثبات اللاهوائي', name: 'Anaerobic Threshold', type: 'numeric', unit: 'نبضة/دقيقة', direction: 'lower_better', min_value: 140, max_value: 200, target_value: 160, category_name: 'Fitness', base_min: 168, base_max: 188 },
  // المهاري
  { name_ar: 'دقة التمرير', name: 'Passing Accuracy', type: 'numeric', unit: '%', direction: 'higher_better', min_value: 40, max_value: 100, target_value: 85, category_name: 'Technical', base_min: 60, base_max: 82 },
  { name_ar: 'التحكم بالكرة', name: 'Ball Control', type: 'rating', unit: '', direction: 'higher_better', min_value: 1, max_value: 10, target_value: 8, category_name: 'Technical', base_min: 5, base_max: 8 },
  { name_ar: 'الضربات على المرمى', name: 'Shots on Target', type: 'numeric', unit: '%', direction: 'higher_better', min_value: 20, max_value: 100, target_value: 65, category_name: 'Technical', base_min: 35, base_max: 60 },
  // التكتيكي
  { name_ar: 'قراءة اللعب', name: 'Game Reading', type: 'rating', unit: '', direction: 'higher_better', min_value: 1, max_value: 10, target_value: 8, category_name: 'Tactical', base_min: 5, base_max: 8 },
  { name_ar: 'التمركز الدفاعي', name: 'Defensive Positioning', type: 'rating', unit: '', direction: 'higher_better', min_value: 1, max_value: 10, target_value: 8, category_name: 'Tactical', base_min: 4, base_max: 7 },
  // الذهني
  { name_ar: 'التركيز تحت الضغط', name: 'Pressure Focus', type: 'rating', unit: '', direction: 'higher_better', min_value: 1, max_value: 10, target_value: 8, category_name: 'Mental', base_min: 5, base_max: 8 },
  { name_ar: 'الثقة بالنفس', name: 'Self Confidence', type: 'rating', unit: '', direction: 'higher_better', min_value: 1, max_value: 10, target_value: 8, category_name: 'Mental', base_min: 5, base_max: 8 },
  // الطبي
  { name_ar: 'نسبة الدهون', name: 'Body Fat', type: 'numeric', unit: '%', direction: 'lower_better', min_value: 5, max_value: 30, target_value: 11, category_name: 'Medical', base_min: 13, base_max: 21 },
  { name_ar: 'الوزن', name: 'Weight', type: 'numeric', unit: 'كجم', direction: 'neutral', min_value: 55, max_value: 100, target_value: 0, category_name: 'Medical', base_min: 66, base_max: 82 },
] as const

const ASSESSMENT_SESSIONS = [
  { name: 'تقييم الأسبوع الأول', session_date: '2026-05-07', week: 0 },
  { name: 'تقييم الأسبوع الثاني', session_date: '2026-05-14', week: 1 },
  { name: 'تقييم الأسبوع الثالث', session_date: '2026-05-21', week: 2 },
  { name: 'تقييم نهاية البرنامج', session_date: '2026-05-28', week: 3 },
]

// Attendance: Mon-Thu (1,2,3,4) for each week of May 2026
const ATTENDANCE_DATES = [
  '2026-05-04','2026-05-05','2026-05-06','2026-05-07',
  '2026-05-11','2026-05-12','2026-05-13','2026-05-14',
  '2026-05-18','2026-05-19','2026-05-20','2026-05-21',
  '2026-05-25','2026-05-26','2026-05-27','2026-05-28',
  '2026-05-29','2026-05-30',
]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function seededRand(seed: number): number { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x) }

// Generate a realistic coach comment for an indicator result
function getIndicatorComment(indIdx: number, playerIdx: number, value: number, ind: typeof DEMO_INDICATORS[number]): string {
  const norm = ind.direction === 'lower_better'
    ? 1 - clamp((value - (ind.min_value as number)) / ((ind.max_value as number) - (ind.min_value as number)), 0, 1)
    : clamp((value - (ind.min_value as number)) / ((ind.max_value as number) - (ind.min_value as number)), 0, 1)

  const COMMENTS_BY_IND: Record<string, string[]> = {
    'Speed 30m': [
      'وقت ممتاز يعكس انفجارية عالية. ننصح بالاستمرار في تمارين الرياضة القوية للحفاظ على هذا المستوى.',
      'وقت جيد مع إمكانية للتحسين. التركيز على وضعية الانطلاق ستساعد في كسب أجزاء من الثانية.',
      'يحتاج تحسيناً في السرعة الانفجارية. ننصح بإدراج تمارين الـ plyometrics في الروتين اليومي.',
    ],
    'Vertical Jump': [
      'ارتفاع استثنائي يعكس قوة عضلية عالية في الطرفين السفليين.',
      'ارتفاع جيد. تمارين القفز بالحجل وتقوية الـ glutes ستساعد في التطوير.',
      'يحتاج عمل على القوة الانفجارية للساقين وتقوية الأوتار.',
    ],
    'Agility T-Test': [
      'رشاقة ممتازة وتغيير اتجاه سريع. أحد أفضل المتدربين في هذا المؤشر.',
      'رشاقة جيدة مع إمكانية التطوير بتمارين اللادر والحواجز.',
      'يحتاج تحسيناً في الكورة السفلى والتوازن عند تغيير الاتجاه.',
    ],
    'VO2 Max': [
      'قدرة هوائية عالية جداً تؤهله للمنافسة في أعلى المستويات.',
      'قدرة هوائية جيدة. التدريب الفتري عالي الشدة (HIIT) سيساعد في الارتقاء.',
      'القدرة الهوائية دون المستهدف. ننصح بزيادة تمارين التحمل تدريجياً.',
    ],
    '6min Run': [
      'مسافة ممتازة تدل على لياقة بدنية عالية وتحمل رائع.',
      'مسافة جيدة. زيادة حجم التدريب التحملي سيساعد في الوصول للهدف.',
      'المسافة أقل من المستهدف. يحتاج تدريبات تحمل إضافية خارج وقت التدريب.',
    ],
    'Anaerobic Threshold': [
      'عتبة لاهوائية ممتازة تعكس كفاءة عالية في استخدام الطاقة.',
      'عتبة جيدة. تدريبات المنطقة الثالثة ستساعد في تحسين هذا المؤشر.',
      'العتبة مرتفعة نسبياً مما يعني استنزافاً أسرع. يحتاج تدريبات تحمل مركزة.',
    ],
    'Passing Accuracy': [
      'دقة تمرير استثنائية. يستطيع توزيع الكرة تحت الضغط بفاعلية عالية.',
      'دقة جيدة. التدريب على التمرير بيد واحدة وعلى السرعة سيحسن النسبة.',
      `نسبة ${Math.round(value)}% أقل من المستهدف البالغ 85%. ننصح بتمارين التمرير التنافسية اليومية.`,
    ],
    'Ball Control': [
      `تحكم ${value}/10 ممتاز. المهارات الفنية راسخة وتظهر أكثر في المواقف الضاغطة.`,
      `تحكم ${value}/10 جيد. يحتاج تطويراً في استلام الكرات العالية والتخلص السريع.`,
      `تحكم ${value}/10 بحاجة لتحسين. ننصح بتمارين التقنية الفردية اليومية لمدة 20 دقيقة.`,
    ],
    'Shots on Target': [
      'نسبة تسديد على المرمى ممتازة. يملك حاسة التسجيل ودقة عالية.',
      'نسبة جيدة. التدريب على الاتزان قبل التسديد وتقوية مفصل القدم مفيد.',
      'النسبة منخفضة نسبياً. ننصح بتمارين التسديد المكثفة من زوايا مختلفة.',
    ],
    'Game Reading': [
      `قراءة اللعب ${value}/10 ممتازة. يستطيع توقع المواقف مسبقاً وهذا نادر.`,
      `قراءة اللعب ${value}/10 جيدة. مشاهدة التحليلات الفيديوية ستساعد في تطوير هذه المهارة.`,
      `قراءة اللعب ${value}/10 بحاجة تطوير. ننصح بجلسات تكتيكية فردية مع المدرب.`,
    ],
    'Defensive Positioning': [
      `تمركز دفاعي ${value}/10 ممتاز. يفهم خطوط الدفاع ويغطي المساحات بذكاء.`,
      `تمركز ${value}/10 جيد. التمارين الموضعية ستساعد في تحسين الوعي الدفاعي.`,
      `التمركز الدفاعي ${value}/10 بحاجة اهتمام. يميل للتقدم في غير وقته.`,
    ],
    'Pressure Focus': [
      `تركيز ${value}/10 تحت الضغط ممتاز. يؤدي أفضل أداء في اللحظات الحاسمة.`,
      `تركيز ${value}/10 جيد. تمارين التنفس واليقظة الذهنية ستساعد في الارتقاء.`,
      `التركيز ${value}/10 متذبذب تحت الضغط. ينصح بجلسات نفسية مع متخصص رياضي.`,
    ],
    'Self Confidence': [
      `ثقة بالنفس ${value}/10 مميزة. هذا اللاعب قيادي بالفطرة ويرفع معنويات الفريق.`,
      `ثقة ${value}/10 جيدة. المشاركة في مباريات تنافسية ستعزز الثقة أكثر.`,
      `الثقة بالنفس ${value}/10 تحتاج تعزيزاً. ننصح بالتركيز على الإنجازات الصغيرة وتحفيزه.`,
    ],
    'Body Fat': [
      `نسبة الدهون ${value}% ممتازة وتعكس التزاماً بالنظام الغذائي والتدريب.`,
      `نسبة الدهون ${value}% جيدة. تعديل طفيف في النظام الغذائي سيحسن النسبة.`,
      `نسبة الدهون ${value}% أعلى من المستهدف. يُنصح بمراجعة النظام الغذائي مع أخصائي تغذية.`,
    ],
    'Weight': [
      `الوزن ${value}كجم مناسب لمركزه وطوله. المحافظة على هذا الوزن هدف المرحلة القادمة.`,
      `الوزن ${value}كجم ضمن النطاق المقبول. مراقبة دورية كل أسبوعين.`,
      `الوزن ${value}كجم يحتاج مراجعة. قد يؤثر على الأداء إذا استمر الارتفاع.`,
    ],
  }

  const templates = COMMENTS_BY_IND[ind.name] || [
    `القيمة ${value}${ind.unit||''} تعكس مستوى جيداً.`,
    `القيمة ${value}${ind.unit||''} ضمن النطاق المقبول.`,
    `القيمة ${value}${ind.unit||''} تحتاج مزيداً من التطوير.`,
  ]
  const idx = norm >= 0.75 ? 0 : norm >= 0.45 ? 1 : 2
  const noise = Math.floor(seededRand(indIdx * 17 + playerIdx * 31) * 0.5)
  return templates[Math.min(idx + noise, templates.length - 1)]
}

// Player evaluation scenarios
const PLAYER_SCENARIOS = [
  // 0: عبدالله العتيبي (حارس - q=0.80)
  { targets: 'الحفاظ على صفر تلقي أهداف في ٧٠٪ من الجلسات التدريبية. تطوير الخروج من المرمى والقرص في المواقف الثنائية.', positives: ['يملك ردود فعل استثنائية خاصة في التصديات القريبة', 'قوة رياضية عالية في الطرفين العلويين', 'يوزع الكرات بدقة بعد التصدي'], negatives: ['يتردد أحياناً في الخروج من منطقة الجزاء', 'يحتاج تحسيناً في التواصل الدفاعي مع الخط الخلفي'], recs: 'ينصح بمشاهدة جلسات فيديو لكبار الحراس لتطوير مهارة قراءة التسديدات. مرشح لقائمة الفريق الأول الموسم القادم.' },
  // 1: وليد الرشيدي (مدافع - q=0.70)
  { targets: 'تحسين الدوريات الدفاعية وتقليل أخطاء التمركز. الوصول لدقة تمرير 82٪ من الخط الخلفي.', positives: ['دفاعي صارم في المواجهات الفردية', 'جيد في الكرات الهوائية'], negatives: ['سرعته البداية بحاجة تطوير', 'أحياناً يتأخر في الانتقال الدفاعي'], recs: 'يُنصح بالتركيز على تمارين التسارع القصيرة وتحسين قراءة حركة المهاجمين.' },
  // 2: عمر الحربي (مدافع - q=0.75)
  { targets: 'بناء استمرارية في الأداء الدفاعي والتحسن في قراءة الكرات الطويلة.', positives: ['مدافع متزن وهادئ تحت الضغط', 'جيد في بدء الهجمات من الخلف'], negatives: ['يحتاج تطوير في السرعة الأفقية', 'أحياناً يفقد مركزه عند الكرات الثانية'], recs: 'الاستمرار في البرامج التدريبية المتقدمة وإضافة ٣ جلسات أسبوعياً للرشاقة.' },
  // 3: محمد الغامدي (مدافع - q=0.72)
  { targets: 'تحسين التواصل الدفاعي مع الزملاء ورفع مستوى التمركز في الكرات الثابتة.', positives: ['حضور جيد في المباريات التدريبية', 'مثابر لا يستسلم'], negatives: ['يحتاج تطوير في الإخلاء تحت الضغط', 'السرعة العكسية بحاجة عمل'], recs: 'متابعة فردية أسبوعية مع مدرب المدافعين لتصحيح الأخطاء الموضعية.' },
  // 4: خالد الزهراني (مدافع - q=0.68)
  { targets: 'رفع نسبة إتمام التمريرات من الخط الخلفي إلى 78٪ وتحسين المواجهات الفردية.', positives: ['يستمع للتعليمات بشكل ممتاز', 'تحسن واضح خلال البرنامج'], negatives: ['ضعف في الكرات الهوائية الدفاعية', 'يفقد الكرة أحياناً عند التحرك بها'], recs: 'برنامج تقوية للطرفين العلويين وتمارين التوازن ستساعد في الارتقاء بمستواه.' },
  // 5: فيصل القحطاني (مدافع - q=0.65)
  { targets: 'بناء قاعدة لياقية قوية وتحسين التمركز الدفاعي الأساسي.', positives: ['روح رياضية إيجابية وتفاعل مع التدريب', 'بدأ يُظهر التحسن في الأسابيع الأخيرة'], negatives: ['اللياقة البدنية دون المستوى المطلوب', 'يتعب بشكل ملحوظ في النصف الثاني'], recs: 'برنامج تأهيلي بدني مكثف لمدة ٦ أسابيع قبل الانضمام للتدريبات التكتيكية المتقدمة.' },
  // 6: أحمد الدوسري (وسط - q=0.85)
  { targets: 'الحفاظ على مستوى الأداء الاستثنائي وتطوير دور القيادة داخل الملعب.', positives: ['يملك رؤية تكتيكية نادرة لسنه', 'دقة تمرير عالية جداً', 'قيادي يرفع مستوى من حوله', 'أفضل لاعب في مؤشري التحمل وقراءة اللعب'], negatives: ['أحياناً يحتفظ بالكرة أطول من اللازم', 'يحتاج المزيد من التسديدات على المرمى'], recs: 'اللاعب جاهز للمنافسة على مركز أساسي في الفريق الأول. ينصح بمشاركته في معسكرات الفريق الأول الموسم القادم.' },
  // 7: سلطان الشهري (وسط - q=0.78)
  { targets: 'الوصول لدقة تمرير 88٪ في المواقف الضاغطة وتحسين التسديد من خارج منطقة الجزاء.', positives: ['حركة بدون كرة ممتازة', 'جيد في استغلال المساحات', 'ذكاء تكتيكي واضح'], negatives: ['التسديد من البعد يحتاج تطوير', 'يفقد التركيز في فترات تراجع الفريق'], recs: 'الاستمرار في التطوير مع تكثيف تمارين التسديد من خارج منطقة الجزاء. خامة جيدة لمركز الجناح.' },
  // 8: طارق المالكي (مهاجم - q=0.90)
  { targets: 'تسجيل أهداف تجريبية في كل جلسة ورفع نسبة التسديدات على المرمى إلى 70٪.', positives: ['حاسة تسجيل استثنائية', 'سريع جداً خلف خط الدفاع', 'ذكي في الحركات داخل منطقة الجزاء', 'أفضل مهاجم في البرنامج'], negatives: ['يحتاج تطوير في التمرير الجانبي للأجنحة', 'أحياناً يُضيع فرصاً سهلة'], recs: 'هذا اللاعب استثمار حقيقي. يُنصح بعرضه على مدير الكرة الأولى فوراً. إمكانياته تتجاوز هذا المستوى.' },
  // 9: يوسف البقمي (وسط - q=0.88)
  { targets: 'التطور في دور صانع اللعب وتحسين التمريرات الحاسمة في الثلث الأخير.', positives: ['صانع لعب ذو إمكانيات عالية', 'رؤية الملعب الأفضل بين المتدربين', 'تقنية عالية مع الكرة'], negatives: ['يحتاج تحسين سرعة اتخاذ القرار تحت الضغط المباشر', 'أحياناً يتأخر في الدفاع'], recs: 'صانع لعب بمواصفات احترافية. ينصح بإتاحة الفرصة له في البطولات التنافسية خلال الموسم القادم.' },
  // 10: ناصر العنزي (مهاجم - q=0.82)
  { targets: 'الحفاظ على معدل التسجيل وتطوير اللعب الظهري لربط الهجمات.', positives: ['قوي جسدياً ويصعب استرداد الكرة منه', 'ممتاز في الكرات الهوائية الهجومية', 'حضور قوي في منطقة الجزاء'], negatives: ['سرعته على المدى الطويل تراجعت في آخر أسبوعين', 'يحتاج عمل على التمريرات الأولى'], recs: 'مهاجم مكتمل الجوانب الجسدية. الاستثمار في السرعة والتقنية سيرفع مستواه بشكل كبير.' },
  // 11: عبدالرحمن الصبيعي (وسط - q=0.60)
  { targets: 'رفع مستوى اللياقة البدنية وتطوير الجانب التقني الأساسي.', positives: ['تحسن ملحوظ من الأسبوع الأول للأخير', 'ملتزم بالحضور والتعليمات'], negatives: ['اللياقة البدنية لا تزال دون المستوى المطلوب', 'يفقد التركيز في المباريات الطويلة', 'التقنية تحتاج تطوير جوهري'], recs: 'يحتاج برنامج تأهيل لياقي فردي لمدة ٤ أسابيع قبل الموسم. إمكانيات موجودة لكنها تحتاج وقتاً.' },
  // 12: علي الحمدان (مهاجم - q=0.76)
  { targets: 'تطوير الحركة خارج الكرة والتمركز الهجومي المبكر.', positives: ['تسديد قوي بكلا القدمين', 'تحمل جيد يسمح له بالضغط حتى نهاية الجلسة'], negatives: ['يحتاج تطوير في الدخول بين المدافعين', 'التمريرات الأخيرة تحتاج دقة أعلى'], recs: 'مهاجم جاد ومجتهد. مشاركته في بطولات المستوى الثاني ستصقل تجربته وترفع مستواه.' },
  // 13: إبراهيم الجهني (مهاجم - q=0.73)
  { targets: 'تحسين سرعة الانطلاق للعمق ورفع نسبة التسديدات المحيطة بالمرمى.', positives: ['سرعة جيدة على المدى القصير', 'يستغل الكرات الثانية بذكاء'], negatives: ['التسديد من الأماكن الضيقة بحاجة تطوير', 'أحياناً يتأخر في الانتقال للهجمة المرتدة'], recs: 'اللاعب يمتلك الأدوات اللازمة للنجاح. العمل على الانتهاء من الفرص سيجعل منه مهاجماً متكاملاً.' },
  // 14: حسن المطيري (وسط - q=0.62)
  { targets: 'بناء قاعدة تقنية وتكتيكية صلبة والوصول لمعدل حضور 90٪ في التدريبات.', positives: ['موهبة خام واضحة', 'تحسن في الأداء في نهاية البرنامج', 'يستجيب للتصحيح بشكل جيد'], negatives: ['عدم الاستمرارية في الأداء من جلسة لأخرى', 'اللياقة البدنية تحتاج تعزيزاً كبيراً', 'أحياناً يفقد التركيز في اللحظات الحاسمة'], recs: 'موهبة تحتاج صقل. ننصح بمتابعة فردية مكثفة وإشراكه في برنامج التطوير الشبابي الموسم القادم.' },
]

function generateValue(
  indicatorIdx: number,
  playerIdx: number,
  weekIdx: number,
  indicator: typeof DEMO_INDICATORS[number]
): number {
  const quality = PLAYER_QUALITY[playerIdx]
  const improvement = IMPROVEMENT[playerIdx]
  const noise = seededRand(indicatorIdx * 100 + playerIdx * 7 + weekIdx * 13) * 0.06 - 0.03 // ±3% noise

  const weekFactor = quality + improvement * weekIdx + noise

  const base_min = indicator.base_min as number
  const base_max = indicator.base_max as number

  let raw: number
  if (indicator.direction === 'lower_better') {
    // Better players and later weeks = lower value
    raw = lerp(base_max, base_min, clamp(weekFactor, 0.5, 1.0))
  } else {
    // Better players and later weeks = higher value
    raw = lerp(base_min, base_max, clamp(weekFactor, 0.5, 1.0))
  }

  // Round appropriately
  if (indicator.type === 'rating') return clamp(Math.round(raw * 10) / 10, 1, 10)
  if (indicator.unit === '%') return clamp(Math.round(raw * 10) / 10, (indicator.min_value as number), (indicator.max_value as number))
  if (indicator.unit === 'ثانية') return clamp(Math.round(raw * 100) / 100, (indicator.min_value as number), (indicator.max_value as number))
  return clamp(Math.round(raw), (indicator.min_value as number), (indicator.max_value as number))
}

export const demoDataService = {
  async isAlreadySeeded(): Promise<boolean> {
    const { data } = await supabase.from('programs').select('id').ilike('name', `%${DEMO_PROGRAM_NAME}%`).limit(1)
    return (data || []).length > 0
  },

  async seedAll(onProgress?: (msg: string) => void): Promise<void> {
    const log = (msg: string) => { onProgress?.(msg); console.log(msg) }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('يجب تسجيل الدخول أولاً')

    // ── 1. Categories ──────────────────────────────────────────────────
    log('إنشاء الأقسام...')
    const { data: existingCats } = await supabase
      .from('indicator_categories').select('id, name').eq('user_id', user.id)
    const existingCatNames = new Set((existingCats || []).map(c => c.name))

    const catMap: Record<string, string> = {}
    for (const existCat of existingCats || []) { catMap[existCat.name] = existCat.id }

    for (const cat of DEMO_CATEGORIES) {
      if (!existingCatNames.has(cat.name)) {
        const { data } = await supabase.from('indicator_categories')
          .insert({ ...cat, user_id: user.id }).select('id').single()
        if (data) catMap[cat.name] = data.id
      }
    }

    // ── 2. Indicators ──────────────────────────────────────────────────
    log('إنشاء المؤشرات...')
    const { data: existingInds } = await supabase
      .from('indicators').select('id, name').eq('user_id', user.id)
    const existingIndNames = new Set((existingInds || []).map(i => i.name))

    const indicatorIds: string[] = []
    for (const ind of DEMO_INDICATORS) {
      if (existingIndNames.has(ind.name)) {
        const found = (existingInds || []).find(i => i.name === ind.name)
        indicatorIds.push(found?.id || '')
        continue
      }
      const { data } = await supabase.from('indicators').insert({
        name: ind.name,
        name_ar: ind.name_ar,
        type: ind.type,
        unit: ind.unit || null,
        direction: ind.direction,
        min_value: ind.min_value,
        max_value: ind.max_value,
        target_value: ind.target_value || null,
        category_id: catMap[ind.category_name] || null,
        is_active: true,
        sort_order: DEMO_INDICATORS.indexOf(ind as never),
        user_id: user.id,
      }).select('id').single()
      indicatorIds.push(data?.id || '')
    }

    // ── 3. Program ─────────────────────────────────────────────────────
    log('إنشاء البرنامج...')
    const { data: prog } = await supabase.from('programs').insert({
      name: DEMO_PROGRAM_NAME,
      description: 'برنامج إعدادي تجريبي لمدة شهر كامل لإظهار إمكانيات النظام',
      season: '2025/2026',
      start_date: '2026-05-01',
      end_date: '2026-05-30',
      is_active: false,
      user_id: user.id,
    }).select('id').single()
    const programId = prog?.id
    if (!programId) throw new Error('فشل إنشاء البرنامج')

    // ── 4. Players (reuse existing if same name, don't create duplicates) ─
    log('إنشاء اللاعبين...')
    const { data: existingPlayers } = await supabase
      .from('players').select('id, full_name').eq('user_id', user.id)
    const existingPlayerMap = new Map((existingPlayers || []).map(p => [p.full_name.trim().toLowerCase(), p.id]))

    const playerIds: string[] = []
    for (const p of DEMO_PLAYERS) {
      const key = p.full_name.trim().toLowerCase()
      if (existingPlayerMap.has(key)) {
        // Reuse existing player
        playerIds.push(existingPlayerMap.get(key)!)
        continue
      }
      const { data } = await supabase.from('players').insert({
        ...p, is_active: true, user_id: user.id,
      }).select('id').single()
      if (data) playerIds.push(data.id)
    }

    // ── 5. Assign players to program ───────────────────────────────────
    log('ربط اللاعبين بالبرنامج...')
    const programPlayers = playerIds.map(pid => ({
      program_id: programId,
      player_id: pid,
      status: 'active',
      joined_date: '2026-05-01',
    }))
    await supabase.from('program_players').insert(programPlayers)

    // ── 6. Assessment sessions + results ──────────────────────────────
    log('إنشاء جلسات التقييم والنتائج...')
    for (const sessionDef of ASSESSMENT_SESSIONS) {
      const { data: session } = await supabase.from('assessment_sessions').insert({
        name: sessionDef.name,
        session_date: sessionDef.session_date,
        program_id: programId,
        is_complete: true,
        user_id: user.id,
      }).select('id').single()
      if (!session) continue

      const results = []
      const isLastSession = sessionDef.week === 3
      for (let pi = 0; pi < playerIds.length; pi++) {
        for (let ii = 0; ii < DEMO_INDICATORS.length; ii++) {
          const ind = DEMO_INDICATORS[ii]
          const value = generateValue(ii, pi, sessionDef.week, ind)
          const resultRow: Record<string, unknown> = {
            session_id: session.id,
            player_id: playerIds[pi],
            indicator_id: indicatorIds[ii],
          }
          if (ind.type === 'numeric') resultRow.value_numeric = value
          else if (ind.type === 'rating') resultRow.value_rating = value
          // Add coach comment on the final session
          if (isLastSession) {
            resultRow.notes = getIndicatorComment(ii, pi, value, ind)
          }
          results.push(resultRow)
        }
      }
      // Insert in batches of 50
      for (let i = 0; i < results.length; i += 50) {
        await supabase.from('assessment_results').insert(results.slice(i, i + 50))
      }
    }

    // ── 7. Attendance sessions + records ──────────────────────────────
    log('إنشاء جلسات الحضور والسجلات...')
    for (const date of ATTENDANCE_DATES) {
      const { data: attSession } = await supabase.from('attendance_sessions').insert({
        session_date: date,
        session_type: 'تدريب',
        program_id: programId,
        user_id: user.id,
      }).select('id').single()
      if (!attSession) continue

      const attRecords = []
      for (let pi = 0; pi < playerIds.length; pi++) {
        const prob = ATTENDANCE_PROB[pi]
        const rand = seededRand(pi * 37 + ATTENDANCE_DATES.indexOf(date) * 13)
        let status: string
        if (rand < prob * 0.85) status = 'present'
        else if (rand < prob) status = 'late'
        else if (rand < prob + 0.08) status = 'excused'
        else status = 'absent'
        attRecords.push({
          attendance_session_id: attSession.id,
          player_id: playerIds[pi],
          status,
        })
      }
      await supabase.from('attendance_records').insert(attRecords)
    }

    // ── 8. Coach notes ────────────────────────────────────────────────
    log('إنشاء ملاحظات المدربين...')
    const noteTemplates = [
      { minQ: 0.85, content: 'اللاعب يظهر مستوى استثنائياً من الالتزام والجدية. تطوره البدني والتقني ملفت للنظر ويتجاوز التوقعات. ينصح بمنحه دوراً قيادياً داخل المجموعة لتعزيز ثقته بنفسه.', category: 'عام' },
      { minQ: 0.70, content: 'أداء منتظم ومتصاعد خلال البرنامج. تحسن ملحوظ في المؤشرات البدنية والمهارية. يحتاج إلى مزيد من التركيز على الجانب التكتيكي وقراءة اللعب الجماعي.', category: 'عام' },
      { minQ: 0.60, content: 'تحسن تدريجي ومقبول خلال مدة البرنامج. الأساس الذي بناه جيد للعمل عليه في المرحلة القادمة. يُنصح بالمتابعة الفردية لبعض النقاط التقنية.', category: 'عام' },
      { minQ: 0, content: 'يحتاج اللاعب إلى جهد إضافي في الجوانب البدنية واللياقية. هناك إرادة واضحة للتطور لكن المستوى الحالي يتطلب عملاً أكثر تركيزاً في التدريبات الفردية.', category: 'عام' },
    ]
    const noteTemplates2 = [
      { minQ: 0.85, content: 'الأسبوع الأخير من البرنامج أظهر نضجاً تكتيكياً واضحاً. اللاعب يقرأ المواقف بشكل أسرع ويتخذ القرار الصحيح تحت الضغط. جاهز للمشاركة في المستوى التنافسي التالي.', category: 'تكتيكي' },
      { minQ: 0.70, content: 'مستوى اللياقة البدنية في تحسن مستمر. قدرة تحمل جيدة مقارنة بالجلسة الأولى. يُنصح بالاستمرار في برامج التحمل بعد انتهاء البرنامج للحفاظ على المكتسبات.', category: 'بدني' },
      { minQ: 0.60, content: 'التزام الحضور كان جيداً بشكل عام. غيابات قليلة لأسباب مقبولة. يجب العمل على الاستمرارية في الجلسات التدريبية لضمان التطور المطلوب.', category: 'عام' },
      { minQ: 0, content: 'يُظهر اللاعب نقاط قوة واضحة في جانب أو أكثر لكن الاتساق في الأداء يحتاج تطويراً. التركيز على تمارين الثقة بالنفس قد يساعد في رفع مستوى الأداء.', category: 'ذهني' },
    ]

    const notes = []
    for (let pi = 0; pi < playerIds.length; pi++) {
      const q = PLAYER_QUALITY[pi]
      const t1 = noteTemplates.find(t => q >= t.minQ) || noteTemplates[noteTemplates.length - 1]
      const t2 = noteTemplates2.find(t => q >= t.minQ) || noteTemplates2[noteTemplates2.length - 1]
      notes.push({
        player_id: playerIds[pi],
        program_id: programId,
        user_id: user.id,
        note_date: '2026-05-14',
        content: t1.content,
        category: t1.category,
      })
      notes.push({
        player_id: playerIds[pi],
        program_id: programId,
        user_id: user.id,
        note_date: '2026-05-28',
        content: t2.content,
        category: t2.category,
      })
    }
    for (let i = 0; i < notes.length; i += 30) {
      await supabase.from('coach_notes').insert(notes.slice(i, i + 30))
    }

    // ── 9. Recommendations ────────────────────────────────────────────
    log('إنشاء التوصيات...')
    const recTemplates = [
      { minQ: 0.85, title: 'ضم للفريق الأول', content: 'اللاعب مؤهل للانضمام للفريق الأول في الموسم القادم. أداؤه خلال البرنامج يؤهله للمنافسة على مركز أساسي. يُنصح ببرنامج تأهلي تخصصي لضمان الجاهزية التامة.', priority: 'high' },
      { minQ: 0.70, title: 'تدريبات تخصصية', content: 'الاستمرار في البرامج التدريبية المتقدمة مع التركيز على الجوانب التكتيكية. المشاركة في مباريات ودية لرفع مستوى التجربة التنافسية.', priority: 'medium' },
      { minQ: 0.60, title: 'برنامج تطوير موسع', content: 'المشاركة في بطولات تنافسية للشباب لصقل التجربة وتطوير الأداء تحت الضغط. متابعة تطور المؤشرات البدنية كل أسبوعين.', priority: 'medium' },
      { minQ: 0, title: 'برنامج تأهيلي فردي', content: 'برنامج تأهيلي فردي لمدة 4-6 أسابيع للتركيز على الجوانب البدنية قبل الانضمام لتدريبات جماعية متقدمة. متابعة أسبوعية مع المدرب المسؤول.', priority: 'low' },
    ]
    const recs = []
    for (let pi = 0; pi < playerIds.length; pi++) {
      const q = PLAYER_QUALITY[pi]
      const t = recTemplates.find(r => q >= r.minQ) || recTemplates[recTemplates.length - 1]
      recs.push({
        player_id: playerIds[pi],
        program_id: programId,
        user_id: user.id,
        recommendation_date: '2026-05-28',
        title: t.title,
        content: t.content,
        priority: t.priority,
        status: 'pending',
      })
    }
    for (let i = 0; i < recs.length; i += 30) {
      await supabase.from('recommendations').insert(recs.slice(i, i + 30))
    }

    // ── 10. Player evaluation notes (targets / positives / negatives / general recs) ──
    log('إنشاء تقييمات اللاعبين الشاملة...')
    const CAT_TARGETS   = '__targets__'
    const CAT_POSITIVES = '__positives__'
    const CAT_NEGATIVES = '__negatives__'
    const CAT_RECS_GEN  = '__general_recs__'

    const evalNotes = []
    for (let pi = 0; pi < playerIds.length; pi++) {
      const sc = PLAYER_SCENARIOS[pi]
      if (!sc) continue
      evalNotes.push({
        player_id: playerIds[pi], program_id: programId, user_id: user.id,
        note_date: '2026-05-28', content: sc.targets, category: CAT_TARGETS,
      })
      evalNotes.push({
        player_id: playerIds[pi], program_id: programId, user_id: user.id,
        note_date: '2026-05-28', content: sc.positives.join('\n'), category: CAT_POSITIVES,
      })
      evalNotes.push({
        player_id: playerIds[pi], program_id: programId, user_id: user.id,
        note_date: '2026-05-28', content: sc.negatives.join('\n'), category: CAT_NEGATIVES,
      })
      evalNotes.push({
        player_id: playerIds[pi], program_id: programId, user_id: user.id,
        note_date: '2026-05-28', content: sc.recs, category: CAT_RECS_GEN,
      })
    }
    for (let i = 0; i < evalNotes.length; i += 30) {
      await supabase.from('coach_notes').insert(evalNotes.slice(i, i + 30))
    }

    log('✅ تمت إضافة البيانات التجريبية بنجاح!')
  },
}
