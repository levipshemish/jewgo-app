/**
 * Internationalization (i18n) System for JewGo App
 * Supports Hebrew, Spanish, and English
 */

export type SupportedLocale = 'en' | 'he' | 'es';

export interface I18nConfig {
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  fallbackLocale: SupportedLocale;
}

export interface TranslationNamespace {
  common: Record<string, string>;
  navigation: Record<string, string>;
  restaurant: Record<string, string>;
  search: Record<string, string>;
  forms: Record<string, string>;
  errors: Record<string, string>;
  newsletter: Record<string, string>;
  feedback: Record<string, string>;
  claims: Record<string, string>;
}

// English translations
const en: TranslationNamespace = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    submit: 'Submit',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    view: 'View',
    add: 'Add',
    remove: 'Remove',
    yes: 'Yes',
    no: 'No',
    open: 'Open',
    closed: 'Closed',
    unknown: 'Unknown',
    km: 'km',
    miles: 'miles',
    minutes: 'minutes',
    hours: 'hours',
    days: 'days',
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
  },
  navigation: {
    home: 'Home',
    restaurants: 'Restaurants',
    eatery: 'Eatery',
    stores: 'Stores',
    shuls: 'Synagogues',
    mikvahs: 'Mikvahs',
    specials: 'Specials',
    favorites: 'Favorites',
    profile: 'Profile',
    settings: 'Settings',
    about: 'About',
    contact: 'Contact',
    help: 'Help',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  restaurant: {
    restaurant: 'Restaurant',
    restaurants: 'Restaurants',
    kosher: 'Kosher',
    dairy: 'Dairy',
    meat: 'Meat',
    pareve: 'Pareve',
    vegetarian: 'Vegetarian',
    vegan: 'Vegan',
    glatt: 'Glatt Kosher',
    cholovYisroel: 'Cholov Yisroel',
    pasYisroel: 'Pas Yisroel',
    hours: 'Hours',
    address: 'Address',
    phone: 'Phone',
    website: 'Website',
    menu: 'Menu',
    photos: 'Photos',
    reviews: 'Reviews',
    rating: 'Rating',
    price: 'Price',
    cuisine: 'Cuisine',
    category: 'Category',
    specials: 'Specials',
    offers: 'Offers',
    delivery: 'Delivery',
    takeout: 'Takeout',
    dineIn: 'Dine In',
    reservations: 'Reservations',
    parking: 'Parking',
    wheelchair: 'Wheelchair Accessible',
    wifi: 'Free WiFi',
    creditCards: 'Credit Cards Accepted',
    cashOnly: 'Cash Only',
    distance: 'Distance',
    directions: 'Get Directions',
    callNow: 'Call Now',
    visitWebsite: 'Visit Website',
    addToFavorites: 'Add to Favorites',
    removeFromFavorites: 'Remove from Favorites',
    share: 'Share',
    reportIssue: 'Report Issue',
    claimOwnership: 'Claim Ownership',
    ownerVerified: 'Owner Verified',
    certifiedBy: 'Certified by',
    lastUpdated: 'Last Updated',
    openNow: 'Open Now',
    closedNow: 'Closed Now',
    openingSoon: 'Opening Soon',
    closingSoon: 'Closing Soon',
  },
  search: {
    searchRestaurants: 'Search Restaurants',
    searchPlaceholder: 'Search by name, cuisine, or location...',
    filters: 'Filters',
    clearFilters: 'Clear Filters',
    sortBy: 'Sort By',
    distance: 'Distance',
    rating: 'Rating',
    price: 'Price',
    name: 'Name',
    relevance: 'Relevance',
    newest: 'Newest',
    popular: 'Popular',
    openNow: 'Open Now',
    kosherCategory: 'Kosher Category',
    allCategories: 'All Categories',
    location: 'Location',
    useMyLocation: 'Use My Location',
    enterLocation: 'Enter Location',
    radius: 'Radius',
    results: 'Results',
    noResults: 'No results found',
    tryAdjustingFilters: 'Try adjusting your search filters',
    loadingResults: 'Loading results...',
    searchError: 'Error searching restaurants',
  },
  forms: {
    required: 'Required',
    optional: 'Optional',
    invalidEmail: 'Invalid email address',
    invalidPhone: 'Invalid phone number',
    invalidUrl: 'Invalid URL',
    minLength: 'Minimum {min} characters',
    maxLength: 'Maximum {max} characters',
    passwordMismatch: 'Passwords do not match',
    termsRequired: 'You must accept the terms and conditions',
    privacyRequired: 'You must accept the privacy policy',
  },
  errors: {
    general: 'Something went wrong. Please try again.',
    network: 'Network error. Please check your connection.',
    notFound: 'The requested resource was not found.',
    unauthorized: 'You are not authorized to perform this action.',
    forbidden: 'Access denied.',
    serverError: 'Server error. Please try again later.',
    validation: 'Please check your input and try again.',
    timeout: 'Request timed out. Please try again.',
    unknown: 'An unknown error occurred.',
  },
  newsletter: {
    title: 'Join the Kosher Foodie Community',
    description: 'Stay updated with the latest kosher restaurants, special offers, and community events in your area.',
    email: 'Email Address',
    firstName: 'First Name',
    lastName: 'Last Name',
    location: 'Location',
    preferences: 'Newsletter Preferences',
    newRestaurants: 'New Restaurant Discoveries',
    specialOffers: 'Special Offers & Deals',
    kosherTips: 'Kosher Cooking Tips',
    communityEvents: 'Community Events',
    weeklyDigest: 'Weekly Digest',
    frequency: 'Email Frequency',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    dietaryRestrictions: 'Dietary Restrictions',
    subscribe: 'Subscribe to Newsletter',
    subscribing: 'Subscribing...',
    subscribed: 'Successfully subscribed!',
    unsubscribe: 'Unsubscribe',
    unsubscribeConfirm: 'Are you sure you want to unsubscribe?',
    privacyNotice: 'We respect your privacy. Unsubscribe at any time.',
  },
  feedback: {
    title: 'Submit Feedback',
    description: 'Help us improve by sharing your feedback',
    type: 'Feedback Type',
    correction: 'Correction',
    suggestion: 'Suggestion',
    general: 'General',
    category: 'Category',
    priority: 'Priority',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    contactEmail: 'Contact Email',
    attachments: 'Attachments',
    submit: 'Submit Feedback',
    submitting: 'Submitting...',
    submitted: 'Feedback submitted successfully!',
    thankYou: 'Thank you for your feedback!',
  },
  claims: {
    title: 'Claim Restaurant Ownership',
    description: 'Submit a claim to manage your restaurant listing',
    ownerName: 'Owner Name',
    ownerEmail: 'Owner Email',
    ownerPhone: 'Owner Phone',
    businessLicense: 'Business License Number',
    proofOfOwnership: 'Proof of Ownership Documents',
    additionalDocuments: 'Additional Documents',
    claimReason: 'Reason for Claim',
    proposedChanges: 'Proposed Changes',
    contactPreference: 'Preferred Contact Method',
    preferredContactTime: 'Preferred Contact Time',
    verificationMethod: 'Verification Method',
    submitClaim: 'Submit Claim',
    submitting: 'Submitting...',
    submitted: 'Claim submitted successfully!',
    thankYou: 'Thank you for submitting your claim!',
    nextSteps: 'Next Steps',
    verification: 'We\'ll verify your ownership documentation',
    confirmation: 'You\'ll receive a confirmation email',
    contact: 'Our team will contact you to discuss next steps',
  },
};

// Hebrew translations
const he: TranslationNamespace = {
  common: {
    loading: 'טוען...',
    error: 'שגיאה',
    success: 'הצלחה',
    cancel: 'ביטול',
    save: 'שמור',
    delete: 'מחק',
    edit: 'ערוך',
    close: 'סגור',
    submit: 'שלח',
    back: 'חזור',
    next: 'הבא',
    previous: 'קודם',
    search: 'חיפוש',
    filter: 'סינון',
    sort: 'מיון',
    view: 'צפייה',
    add: 'הוסף',
    remove: 'הסר',
    yes: 'כן',
    no: 'לא',
    open: 'פתוח',
    closed: 'סגור',
    unknown: 'לא ידוע',
    km: 'ק"מ',
    miles: 'מיילים',
    minutes: 'דקות',
    hours: 'שעות',
    days: 'ימים',
    today: 'היום',
    tomorrow: 'מחר',
    yesterday: 'אתמול',
  },
  navigation: {
    home: 'בית',
    restaurants: 'מסעדות',
    eatery: 'אוכל',
    stores: 'חנויות',
    shuls: 'בתי כנסת',
    mikvahs: 'מקוואות',
    specials: 'מבצעים',
    favorites: 'מועדפים',
    profile: 'פרופיל',
    settings: 'הגדרות',
    about: 'אודות',
    contact: 'צור קשר',
    help: 'עזרה',
    privacy: 'מדיניות פרטיות',
    terms: 'תנאי שימוש',
  },
  restaurant: {
    restaurant: 'מסעדה',
    restaurants: 'מסעדות',
    kosher: 'כשר',
    dairy: 'חלבי',
    meat: 'בשרי',
    pareve: 'פרווה',
    vegetarian: 'צמחוני',
    vegan: 'טבעוני',
    glatt: 'גלאט כשר',
    cholovYisroel: 'חלב ישראל',
    pasYisroel: 'פאס ישראל',
    hours: 'שעות פעילות',
    address: 'כתובת',
    phone: 'טלפון',
    website: 'אתר אינטרנט',
    menu: 'תפריט',
    photos: 'תמונות',
    reviews: 'ביקורות',
    rating: 'דירוג',
    price: 'מחיר',
    cuisine: 'מטבח',
    category: 'קטגוריה',
    specials: 'מבצעים',
    offers: 'הצעות',
    delivery: 'משלוח',
    takeout: 'אריזה',
    dineIn: 'ישיבה במקום',
    reservations: 'הזמנות',
    parking: 'חניה',
    wheelchair: 'נגיש לכיסא גלגלים',
    wifi: 'WiFi חינם',
    creditCards: 'מקבל כרטיסי אשראי',
    cashOnly: 'מזומן בלבד',
    distance: 'מרחק',
    directions: 'קבל הנחיות',
    callNow: 'התקשר עכשיו',
    visitWebsite: 'בקר באתר',
    addToFavorites: 'הוסף למועדפים',
    removeFromFavorites: 'הסר מהמועדפים',
    share: 'שתף',
    reportIssue: 'דווח על בעיה',
    claimOwnership: 'תבע בעלות',
    ownerVerified: 'בעלים מאומת',
    certifiedBy: 'מאושר על ידי',
    lastUpdated: 'עודכן לאחרונה',
    openNow: 'פתוח עכשיו',
    closedNow: 'סגור עכשיו',
    openingSoon: 'יפתח בקרוב',
    closingSoon: 'ייסגר בקרוב',
  },
  search: {
    searchRestaurants: 'חיפוש מסעדות',
    searchPlaceholder: 'חפש לפי שם, מטבח או מיקום...',
    filters: 'סינונים',
    clearFilters: 'נקה סינונים',
    sortBy: 'מיין לפי',
    distance: 'מרחק',
    rating: 'דירוג',
    price: 'מחיר',
    name: 'שם',
    relevance: 'רלוונטיות',
    newest: 'חדש ביותר',
    popular: 'פופולרי',
    openNow: 'פתוח עכשיו',
    kosherCategory: 'קטגוריית כשרות',
    allCategories: 'כל הקטגוריות',
    location: 'מיקום',
    useMyLocation: 'השתמש במיקום שלי',
    enterLocation: 'הכנס מיקום',
    radius: 'רדיוס',
    results: 'תוצאות',
    noResults: 'לא נמצאו תוצאות',
    tryAdjustingFilters: 'נסה לשנות את סינוני החיפוש',
    loadingResults: 'טוען תוצאות...',
    searchError: 'שגיאה בחיפוש מסעדות',
  },
  forms: {
    required: 'נדרש',
    optional: 'אופציונלי',
    invalidEmail: 'כתובת אימייל לא תקינה',
    invalidPhone: 'מספר טלפון לא תקין',
    invalidUrl: 'כתובת URL לא תקינה',
    minLength: 'מינימום {min} תווים',
    maxLength: 'מקסימום {max} תווים',
    passwordMismatch: 'הסיסמאות אינן תואמות',
    termsRequired: 'עליך לקבל את תנאי השימוש',
    privacyRequired: 'עליך לקבל את מדיניות הפרטיות',
  },
  errors: {
    general: 'משהו השתבש. אנא נסה שוב.',
    network: 'שגיאת רשת. אנא בדוק את החיבור שלך.',
    notFound: 'המשאב המבוקש לא נמצא.',
    unauthorized: 'אינך מורשה לבצע פעולה זו.',
    forbidden: 'גישה נדחתה.',
    serverError: 'שגיאת שרת. אנא נסה שוב מאוחר יותר.',
    validation: 'אנא בדוק את הקלט שלך ונסה שוב.',
    timeout: 'הבקשה פגה. אנא נסה שוב.',
    unknown: 'אירעה שגיאה לא ידועה.',
  },
  newsletter: {
    title: 'הצטרף לקהילת אוכלי הכשר',
    description: 'הישאר מעודכן עם המסעדות הכשרות החדשות, מבצעים מיוחדים ואירועי קהילה באזור שלך.',
    email: 'כתובת אימייל',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    location: 'מיקום',
    preferences: 'העדפות ניוזלטר',
    newRestaurants: 'גילוי מסעדות חדשות',
    specialOffers: 'מבצעים והצעות מיוחדות',
    kosherTips: 'טיפים לבישול כשר',
    communityEvents: 'אירועי קהילה',
    weeklyDigest: 'סיכום שבועי',
    frequency: 'תדירות אימייל',
    weekly: 'שבועי',
    biweekly: 'דו-שבועי',
    monthly: 'חודשי',
    dietaryRestrictions: 'הגבלות תזונתיות',
    subscribe: 'הרשם לניוזלטר',
    subscribing: 'נרשם...',
    subscribed: 'נרשם בהצלחה!',
    unsubscribe: 'בטל הרשמה',
    unsubscribeConfirm: 'האם אתה בטוח שברצונך לבטל את ההרשמה?',
    privacyNotice: 'אנו מכבדים את הפרטיות שלך. בטל הרשמה בכל עת.',
  },
  feedback: {
    title: 'שלח משוב',
    description: 'עזור לנו להשתפר על ידי שיתוף המשוב שלך',
    type: 'סוג משוב',
    correction: 'תיקון',
    suggestion: 'הצעה',
    general: 'כללי',
    category: 'קטגוריה',
    priority: 'עדיפות',
    low: 'נמוכה',
    medium: 'בינונית',
    high: 'גבוהה',
    contactEmail: 'אימייל ליצירת קשר',
    attachments: 'קבצים מצורפים',
    submit: 'שלח משוב',
    submitting: 'שולח...',
    submitted: 'המשוב נשלח בהצלחה!',
    thankYou: 'תודה על המשוב שלך!',
  },
  claims: {
    title: 'תבע בעלות על מסעדה',
    description: 'שלח תביעה לניהול רישום המסעדה שלך',
    ownerName: 'שם הבעלים',
    ownerEmail: 'אימייל הבעלים',
    ownerPhone: 'טלפון הבעלים',
    businessLicense: 'מספר רישיון עסק',
    proofOfOwnership: 'מסמכי הוכחת בעלות',
    additionalDocuments: 'מסמכים נוספים',
    claimReason: 'סיבת התביעה',
    proposedChanges: 'שינויים מוצעים',
    contactPreference: 'שיטת יצירת קשר מועדפת',
    preferredContactTime: 'זמן יצירת קשר מועדף',
    verificationMethod: 'שיטת אימות',
    submitClaim: 'שלח תביעה',
    submitting: 'שולח...',
    submitted: 'התביעה נשלחה בהצלחה!',
    thankYou: 'תודה על שליחת התביעה שלך!',
    nextSteps: 'השלבים הבאים',
    verification: 'נאמת את מסמכי הבעלות שלך',
    confirmation: 'תקבל אימייל אישור',
    contact: 'הצוות שלנו יצור איתך קשר לדון בשלבים הבאים',
  },
};

// Spanish translations
const es: TranslationNamespace = {
  common: {
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    submit: 'Enviar',
    back: 'Atrás',
    next: 'Siguiente',
    previous: 'Anterior',
    search: 'Buscar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    view: 'Ver',
    add: 'Agregar',
    remove: 'Quitar',
    yes: 'Sí',
    no: 'No',
    open: 'Abierto',
    closed: 'Cerrado',
    unknown: 'Desconocido',
    km: 'km',
    miles: 'millas',
    minutes: 'minutos',
    hours: 'horas',
    days: 'días',
    today: 'Hoy',
    tomorrow: 'Mañana',
    yesterday: 'Ayer',
  },
  navigation: {
    home: 'Inicio',
    restaurants: 'Restaurantes',
    eatery: 'Comida',
    stores: 'Tiendas',
    shuls: 'Sinagogas',
    mikvahs: 'Mikvahs',
    specials: 'Ofertas',
    favorites: 'Favoritos',
    profile: 'Perfil',
    settings: 'Configuración',
    about: 'Acerca de',
    contact: 'Contacto',
    help: 'Ayuda',
    privacy: 'Política de Privacidad',
    terms: 'Términos de Servicio',
  },
  restaurant: {
    restaurant: 'Restaurante',
    restaurants: 'Restaurantes',
    kosher: 'Kosher',
    dairy: 'Lácteos',
    meat: 'Carne',
    pareve: 'Pareve',
    vegetarian: 'Vegetariano',
    vegan: 'Vegano',
    glatt: 'Glatt Kosher',
    cholovYisroel: 'Cholov Yisroel',
    pasYisroel: 'Pas Yisroel',
    hours: 'Horarios',
    address: 'Dirección',
    phone: 'Teléfono',
    website: 'Sitio web',
    menu: 'Menú',
    photos: 'Fotos',
    reviews: 'Reseñas',
    rating: 'Calificación',
    price: 'Precio',
    cuisine: 'Cocina',
    category: 'Categoría',
    specials: 'Ofertas',
    offers: 'Promociones',
    delivery: 'Entrega',
    takeout: 'Para llevar',
    dineIn: 'Comer en el lugar',
    reservations: 'Reservaciones',
    parking: 'Estacionamiento',
    wheelchair: 'Accesible para silla de ruedas',
    wifi: 'WiFi gratuito',
    creditCards: 'Acepta tarjetas de crédito',
    cashOnly: 'Solo efectivo',
    distance: 'Distancia',
    directions: 'Obtener direcciones',
    callNow: 'Llamar ahora',
    visitWebsite: 'Visitar sitio web',
    addToFavorites: 'Agregar a favoritos',
    removeFromFavorites: 'Quitar de favoritos',
    share: 'Compartir',
    reportIssue: 'Reportar problema',
    claimOwnership: 'Reclamar propiedad',
    ownerVerified: 'Propietario verificado',
    certifiedBy: 'Certificado por',
    lastUpdated: 'Última actualización',
    openNow: 'Abierto ahora',
    closedNow: 'Cerrado ahora',
    openingSoon: 'Abriendo pronto',
    closingSoon: 'Cerrando pronto',
  },
  search: {
    searchRestaurants: 'Buscar Restaurantes',
    searchPlaceholder: 'Buscar por nombre, cocina o ubicación...',
    filters: 'Filtros',
    clearFilters: 'Limpiar filtros',
    sortBy: 'Ordenar por',
    distance: 'Distancia',
    rating: 'Calificación',
    price: 'Precio',
    name: 'Nombre',
    relevance: 'Relevancia',
    newest: 'Más reciente',
    popular: 'Popular',
    openNow: 'Abierto ahora',
    kosherCategory: 'Categoría Kosher',
    allCategories: 'Todas las categorías',
    location: 'Ubicación',
    useMyLocation: 'Usar mi ubicación',
    enterLocation: 'Ingresar ubicación',
    radius: 'Radio',
    results: 'Resultados',
    noResults: 'No se encontraron resultados',
    tryAdjustingFilters: 'Intenta ajustar tus filtros de búsqueda',
    loadingResults: 'Cargando resultados...',
    searchError: 'Error al buscar restaurantes',
  },
  forms: {
    required: 'Requerido',
    optional: 'Opcional',
    invalidEmail: 'Dirección de correo electrónico inválida',
    invalidPhone: 'Número de teléfono inválido',
    invalidUrl: 'URL inválida',
    minLength: 'Mínimo {min} caracteres',
    maxLength: 'Máximo {max} caracteres',
    passwordMismatch: 'Las contraseñas no coinciden',
    termsRequired: 'Debes aceptar los términos y condiciones',
    privacyRequired: 'Debes aceptar la política de privacidad',
  },
  errors: {
    general: 'Algo salió mal. Por favor, inténtalo de nuevo.',
    network: 'Error de red. Por favor, verifica tu conexión.',
    notFound: 'El recurso solicitado no se encontró.',
    unauthorized: 'No estás autorizado para realizar esta acción.',
    forbidden: 'Acceso denegado.',
    serverError: 'Error del servidor. Por favor, inténtalo más tarde.',
    validation: 'Por favor, verifica tu entrada e inténtalo de nuevo.',
    timeout: 'La solicitud expiró. Por favor, inténtalo de nuevo.',
    unknown: 'Ocurrió un error desconocido.',
  },
  newsletter: {
    title: 'Únete a la Comunidad de Comida Kosher',
    description: 'Mantente actualizado con los últimos restaurantes kosher, ofertas especiales y eventos comunitarios en tu área.',
    email: 'Dirección de correo electrónico',
    firstName: 'Nombre',
    lastName: 'Apellido',
    location: 'Ubicación',
    preferences: 'Preferencias del boletín',
    newRestaurants: 'Descubrimientos de restaurantes nuevos',
    specialOffers: 'Ofertas y promociones especiales',
    kosherTips: 'Consejos de cocina kosher',
    communityEvents: 'Eventos comunitarios',
    weeklyDigest: 'Resumen semanal',
    frequency: 'Frecuencia de correo electrónico',
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual',
    dietaryRestrictions: 'Restricciones dietéticas',
    subscribe: 'Suscribirse al boletín',
    subscribing: 'Suscribiendo...',
    subscribed: '¡Suscrito exitosamente!',
    unsubscribe: 'Cancelar suscripción',
    unsubscribeConfirm: '¿Estás seguro de que quieres cancelar la suscripción?',
    privacyNotice: 'Respetamos tu privacidad. Cancela la suscripción en cualquier momento.',
  },
  feedback: {
    title: 'Enviar Comentarios',
    description: 'Ayúdanos a mejorar compartiendo tus comentarios',
    type: 'Tipo de comentario',
    correction: 'Corrección',
    suggestion: 'Sugerencia',
    general: 'General',
    category: 'Categoría',
    priority: 'Prioridad',
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    contactEmail: 'Correo electrónico de contacto',
    attachments: 'Archivos adjuntos',
    submit: 'Enviar comentarios',
    submitting: 'Enviando...',
    submitted: '¡Comentarios enviados exitosamente!',
    thankYou: '¡Gracias por tus comentarios!',
  },
  claims: {
    title: 'Reclamar Propiedad del Restaurante',
    description: 'Envía una reclamación para gestionar el listado de tu restaurante',
    ownerName: 'Nombre del propietario',
    ownerEmail: 'Correo electrónico del propietario',
    ownerPhone: 'Teléfono del propietario',
    businessLicense: 'Número de licencia comercial',
    proofOfOwnership: 'Documentos de prueba de propiedad',
    additionalDocuments: 'Documentos adicionales',
    claimReason: 'Razón de la reclamación',
    proposedChanges: 'Cambios propuestos',
    contactPreference: 'Método de contacto preferido',
    preferredContactTime: 'Tiempo de contacto preferido',
    verificationMethod: 'Método de verificación',
    submitClaim: 'Enviar reclamación',
    submitting: 'Enviando...',
    submitted: '¡Reclamación enviada exitosamente!',
    thankYou: '¡Gracias por enviar tu reclamación!',
    nextSteps: 'Próximos pasos',
    verification: 'Verificaremos tu documentación de propiedad',
    confirmation: 'Recibirás un correo electrónico de confirmación',
    contact: 'Nuestro equipo se pondrá en contacto contigo para discutir los próximos pasos',
  },
};

const translations: Record<SupportedLocale, TranslationNamespace> = {
  en,
  he,
  es,
};

class I18nManager {
  private currentLocale: SupportedLocale;
  private config: I18nConfig;

  constructor(config: I18nConfig) {
    this.config = config;
    this.currentLocale = this.getInitialLocale();
  }

  private getInitialLocale(): SupportedLocale {
    // Check localStorage first
    const savedLocale = localStorage.getItem('jewgo_locale') as SupportedLocale;
    if (savedLocale && this.config.supportedLocales.includes(savedLocale)) {
      return savedLocale;
    }

    // Check browser language
    const browserLocale = navigator.language.split('-')[0] as SupportedLocale;
    if (this.config.supportedLocales.includes(browserLocale)) {
      return browserLocale;
    }

    // Fallback to default
    return this.config.defaultLocale;
  }

  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  setLocale(locale: SupportedLocale): void {
    if (!this.config.supportedLocales.includes(locale)) {
      throw new Error(`Unsupported locale: ${locale}`);
    }

    this.currentLocale = locale;
    localStorage.setItem('jewgo_locale', locale);
    
    // Update document direction for RTL languages
    document.documentElement.dir = locale === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }

  t(key: string, namespace: keyof TranslationNamespace = 'common', params?: Record<string, string>): string {
    const translation = translations[this.currentLocale]?.[namespace]?.[key] ||
                       translations[this.config.fallbackLocale]?.[namespace]?.[key] ||
                       key;

    if (params) {
      return translation.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] || match;
      });
    }

    return translation;
  }

  getSupportedLocales(): SupportedLocale[] {
    return this.config.supportedLocales;
  }

  isRTL(): boolean {
    return this.currentLocale === 'he';
  }

  formatNumber(number: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLocale, options).format(number);
  }

  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat(this.currentLocale, {
      style: 'currency',
      currency,
    }).format(amount);
  }
}

// Default configuration
const defaultConfig: I18nConfig = {
  defaultLocale: 'en',
  supportedLocales: ['en', 'he', 'es'],
  fallbackLocale: 'en',
};

// Create singleton instance
let i18nInstance: I18nManager | null = null;

export function initI18n(config: I18nConfig = defaultConfig): I18nManager {
  if (!i18nInstance) {
    i18nInstance = new I18nManager(config);
  }
  return i18nInstance;
}

export function getI18n(): I18nManager {
  if (!i18nInstance) {
    throw new Error('I18n not initialized. Call initI18n() first.');
  }
  return i18nInstance;
}

// React hook for translations
export function useTranslation() {
  const i18n = getI18n();
  
  return {
    t: i18n.t.bind(i18n),
    locale: i18n.getLocale(),
    setLocale: i18n.setLocale.bind(i18n),
    isRTL: i18n.isRTL(),
    supportedLocales: i18n.getSupportedLocales(),
  };
}

// Export translations
export { translations }; 