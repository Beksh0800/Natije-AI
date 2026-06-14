import type { 
  ArchiveEntry, 
  ChatMessage, 
  ReviewCriteria, 
  ReviewMistake, 
  PlanItem, 
  CategoryStat 
} from '../types';

// ---- Student Dashboard Data ----
export const assignmentInfo = {
  title: 'Дробтар қосу және азайту',
  subject: 'Математика',
  assignedDate: '10.05.2025',
  dueDate: '17.05.2025',
  status: 'Кері байланыс берілді',
  description: 'Алгебралық өрнектерді түрлендіріп, ықшамдаңыз.',
  file: {
    name: 'Алгебра_тапсырма_7сынып.pdf',
    size: '1.2 MB',
    verified: true,
  },
};

export const teacherFeedback = {
  teacherName: 'Айгүл Мұратқызы',
  teacherSubject: 'Математика пәні мұғалімі',
  score: 80,
  maxScore: 100,
  stars: 4.8,
  strengths: [
    'Есептің шартын дұрыс түсінген.',
    'Бөліктерді ортақ бөлімге келтіруді жақсы меңгерген.',
  ],
  improvements: [
    'Қосу кезінде бөлімдерді шатастыратындығын.',
    'Нәтижені қысқартуды ұмытып кететіндігін.',
  ],
};

export const aiAnalysis = {
  score: 78,
  strengths: [
    'Ортақ бөлімге келтіру',
    'Есептеу дағдылары',
    'Тапсырманы түсіну',
  ],
  weaknesses: [
    'Дамытуды қажет ететін дағдылар:',
    'Бөліктерді шатастыру',
    'Қысқарту дағдысы',
  ],
  explanation: 'Сен бөліктерді қосуды жақсы түсінесің. Бірақ кейде бөлімдерді шатастырасың, нәтижені қысқартуды ұмытып кетесің. Жоспарға сай жаттығып, қайта тапсырсаң, нәтижең тағы да жақсарады!',
};

export const aiMistakes: ReviewMistake[] = [
  { type: 'Есептеу', description: '3/10 деп жазғансың, Дұрысы: 2/5 + 1/10 = 4/10 + 1/10 = 5/10 = 1/2', category: 'Бөліктер' },
  { type: 'Қысқарту', description: '7/8 деп жазғансың, Дұрысы: 4/8 + 1/4 = 1/4 = 7/8', category: 'Бөліктер' },
  { type: 'Есептеу', description: '3/10 деп жазғансың, Дұрысы: 2/5 + 1/10 = 4/10 + 1/10 = 5/10 = 1/2', category: 'Есептеу' },
];

export const aiCriteria: ReviewCriteria[] = [
  { name: 'Мазмұнның толықтығы', score: 4, maxScore: 5 },
  { name: 'Тақырыпқа сәйкестік', score: 4, maxScore: 5 },
  { name: 'Құрылым және логика', score: 4, maxScore: 5 },
  { name: 'Тілдік сауаттылық', score: 4, maxScore: 5 },
];

// ---- Chat Messages ----
export const chatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Сәлеметсіз бе, Санибек! 👋 Мен саған тапсырмаңды жақсартуға көмектесемін. Қандай көмек керек?',
    timestamp: '10:44',
  },
  {
    id: '2',
    role: 'user',
    content: 'Категлері түсіндіріп бер.',
    timestamp: '10:45',
  },
  {
    id: '3',
    role: 'assistant',
    content: 'Мін, сенің жұмысыңдағы қателерді категория бойынша түсіндіруге көмектесемін:\n\n1) 5/5 деп жазғансың, Дұрысы: A₁² + ½ = ⅓ + ¼ = 5/5\n\n2) 7/8 деп жазғансың, Дұрысы: 4/8 + ½ + ¼ = 7/8\n\n3) 3/10 деп жазғансың, Дұрысы: 2/5 + 1/10 = 4/10 + 1/10 = 5/10 = 1/2\n\nБөліктерді ортақ бөлімге келтіріп, кейін қосыңыз, қысқартуды ұмытпаңыз!',
    timestamp: '10:45',
  },
];

export const chatSuggestions = [
  'Категлері түсіндіріп бер',
  'Ұқсас тапсырма дайындап бер',
  'Бөлімдерді қалай шатастырмауға болады?',
  'Қысқарту ережесін еске түсіріп бер',
];

// ---- Plan Items ----
export const planItems: PlanItem[] = [
  {
    id: '1',
    title: 'Бөлімдерді шатастырмау',
    description: 'Бөлімдерді қайтақадаулар дұрыс түсіндік.',
    status: 'completed',
    detail: '2 видео сабақ',
    detailType: 'info',
  },
  {
    id: '2',
    title: 'Қысқарту дағдысын дамыту',
    description: 'Нәтижені қысқарту ережесін кайталау.',
    status: 'in-progress',
    detail: '3 жаттығу',
    detailType: 'warning',
  },
  {
    id: '3',
    title: 'Қосымша жаттығулар орындау',
    description: 'Оқу материалын қоснынша тапсырмалар орындау.',
    status: 'pending',
    detail: '5 тапсырма',
    detailType: 'success',
  },
  {
    id: '4',
    title: 'Жаңа жұмысты қайта тапсыру',
    description: 'Барлық ережені қайтасоқ, жұмысты қайта жазу.',
    status: 'pending',
  },
];

// ---- Category Stats ----
export const categoryStats: CategoryStat[] = [
  { name: 'Бөліктер', count: 2 },
  { name: 'Қысқарту', count: 2 },
  { name: 'Есептеу', count: 1 },
  { name: 'Басқалар', count: 0 },
];

// ---- Archive Data ----
export const archiveEntries: ArchiveEntry[] = [
  {
    id: '1',
    title: 'Алгебралық өрнектерді түрлендіру',
    subtitle: 'Тапсырма №45',
    subject: 'Математика',
    date: '10.05.2025',
    score: 78,
    type: 'Тапсырма',
    typeBadgeColor: 'purple',
  },
  {
    id: '2',
    title: 'Қазақстан тарихы – Тәуелсіздік кезеңі',
    subtitle: 'Тест тапсырмасы',
    subject: 'Тарих',
    date: '08.05.2025',
    score: 92,
    type: 'Тест',
    typeBadgeColor: 'green',
  },
  {
    id: '3',
    title: 'Future Simple Tense',
    subtitle: 'Грамматика бойынша жаттығу',
    subject: 'Ағылшын тілі',
    date: '06.05.2025',
    score: 65,
    type: 'Жаттығу',
    typeBadgeColor: 'yellow',
  },
  {
    id: '4',
    title: 'Физика: Күш және қозғалыс',
    subtitle: 'Практикалық жұмыс',
    subject: 'Физика',
    date: '04.05.2025',
    score: 88,
    type: 'Практика',
    typeBadgeColor: 'blue',
  },
  {
    id: '5',
    title: 'Жаңа Қазақстан – болашаққа қадам',
    subtitle: 'Эссе жазу',
    subject: 'Қазақ тілі',
    date: '02.05.2025',
    score: 90,
    type: 'Эссе',
    typeBadgeColor: 'pink',
  },
  {
    id: '6',
    title: 'AI және біздің өміріміз',
    subtitle: 'Жоба жұмысы',
    subject: 'Информатика',
    date: '30.04.2025',
    score: 95,
    type: 'Жоба',
    typeBadgeColor: 'cyan',
  },
  {
    id: '7',
    title: 'Химиялық реакция теңдеулері',
    subtitle: 'Тапсырма №32',
    subject: 'Химия',
    date: '28.04.2025',
    score: 70,
    type: 'Тапсырма',
    typeBadgeColor: 'purple',
  },
  {
    id: '8',
    title: 'Биология: Жасуша құрылысы',
    subtitle: 'Тест тапсырмасы',
    subject: 'Биология',
    date: '25.04.2025',
    score: 82,
    type: 'Тест',
    typeBadgeColor: 'green',
  },
];

export const archiveContentStats = [
  { name: 'Тапсырмалар', count: 12 },
  { name: 'Тесттер', count: 6 },
  { name: 'Жаттығулар', count: 4 },
  { name: 'Эсселер', count: 3 },
  { name: 'Жобалар', count: 2 },
  { name: 'Файлдар', count: 15 },
  { name: 'Кері байланыстар', count: 18 },
  { name: 'AI талдаулары', count: 10 },
];

// ---- Teacher Review Data ----
export const teacherReviewData = {
  title: 'Эссе жазу',
  isNew: true,
  topic: '"Менің болашақ мамандығым" тақырыбында эссе жазыңыз (150-200 сөз).',
  uploadDate: '13 мамыр, 2025 14:30',
  dueDate: '16 мамыр, 2025 23:59',
  maxScore: 20,
  file: {
    name: 'Эссе.docx',
    uploadDate: '15.05.2025 10:45',
  },
  aiScore: 16,
  aiMaxScore: 20,
  criteria: [
    { name: 'Мазмұннің толықтығы', score: 4, maxScore: 5 },
    { name: 'Тақырыпқа сәйкестік', score: 4, maxScore: 5 },
    { name: 'Құрылым және логика', score: 4, maxScore: 5 },
    { name: 'Тілдік сауаттылық', score: 4, maxScore: 5 },
  ] as ReviewCriteria[],
  mistakes: [
    '2 орфографиялық қате табылды.',
    '1 пунктуациялық қате бар.',
    'Кейбір сөйлемдерде сөйлем құрылымы күрделі, қарапайымдата алайсыз.',
  ],
  strengths: [
    'Тақырыпты жақсы ашқансыз.',
    'Өз ойыңыз нақты және түсінікті.',
    'Кіріспе, негізгі бөлім, қорытынды толық.',
  ],
  recommendations: [
    'Орфографиялық қатені түзетіңіз.',
    'Сөйлемдерді қысқа әрі нақты жазыңыз.',
    'Қорытынды бөлімде жеке пікіріңізді тереңірек көрсетіңіз.',
  ],
  essayText: 'Тақырып жақсы ашылған, бірақ қорытынды бөлімді толықтыра алайсыз.\nСонымен қатар, 3 жерінде сөйлем құрылымы күрделі.',
};

export const teacherChatMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Сәлем! Мен NÄTIJE AI көмекшісімін. Платформаны қолдану немесе оқушылардың жұмысын тексеру бойынша сұрақтарыңыз болса, жауап беруге дайынмын.',
    timestamp: new Date().toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' }),
  }
];


// ---- Student Sidebar Navigation ----
export const studentNavItems = [
  { label: 'Басты бет', path: '/', icon: 'home' },
  { label: 'Менің тапсырмаларым', path: '/assignments', icon: 'file-text' },
  { label: 'Менің үлгерімім', path: '/progress', icon: 'trending-up' },
  { label: 'Сыныпқа қосылу', path: '/join-class', icon: 'plus-circle' },
  { label: 'Хабарламалар', path: '/messages', icon: 'message-circle' },
  { label: 'Архив', path: '/archive', icon: 'folder' },
];

export const teacherNavItems = [
  { label: 'Басты бет', path: '/teacher', icon: 'home' },
  { label: 'Сыныптар', path: '/teacher/classes', icon: 'users' },
  { label: 'Оқушылар', path: '/teacher/students', icon: 'users' },
  { label: 'Жұмыс жүктеу', path: '/teacher/upload', icon: 'upload' },
  { label: 'Тапсырмалар', path: '/teacher/assignments', icon: 'file-text' },
  { label: 'Хабарламалар', path: '/messages', icon: 'message-circle' },
  { label: 'Статистика', path: '/teacher/stats', icon: 'bar-chart-2' },
];

export const quickActions = [
  { label: 'Жаңа тапсырма', icon: 'plus-circle', color: 'primary' },
  { label: 'AI көмекші чат', icon: 'bot', color: 'secondary' },
];
