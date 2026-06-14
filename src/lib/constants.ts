export const SUBJECTS = [
  'Математика',
  'Алгебра',
  'Геометрия',
  'Қазақ тілі',
  'Қазақ әдебиеті',
  'Орыс тілі',
  'Орыс әдебиеті',
  'Ағылшын тілі',
  'Физика',
  'Химия',
  'Биология',
  'География',
  'Дүние жүзі тарихы',
  'Қазақстан тарихы',
  'Информатика',
  'Жаратылыстану',
  'Дүниетану'
];

export const CLASS_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Жұмыс түрлерінің аудармасы
export const ASSIGNMENT_TYPES: Record<string, string> = {
  'assignment': 'Үй жұмысы',
  'test': 'Бақылау жұмысы',
  'project': 'Жоба',
  'practice': 'Практика',
  'essay': 'Эссе',
};

// Статустар аудармасы
export const STATUS_MAP: Record<string, { label: string, color: string }> = {
  'uploaded': { label: 'Жүктелді', color: 'blue' },
  'processing': { label: 'Тексерілуде', color: 'yellow' },
  'pending_teacher_review': { label: 'Мұғалім тексеруінде', color: 'orange' },
  'reviewed': { label: 'Тексерілді', color: 'green' },
  'error': { label: 'Қате шықты', color: 'red' },
};

export const CLASS_LETTERS = [
  'А', 'Ә', 'Б', 'В', 'Г', 'Ғ', 'Д', 'Е', 'Ж', 'З', 'И', 'К', 'Л', 'М', 'Н'
];
