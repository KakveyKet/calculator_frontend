export default {
  common: {
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    update: "Update",
    edit: "Edit",
    delete: "Delete",
    search: "Search",
    view: "View",
    back: "Back",
    loading: "Loading...",
    action: "Action",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    total: "Total",
    actions: "Actions",
    clear: "Clear",
  },

  navigation: {
    dashboard: "Dashboard",
    calculator: "Calculator",
    invoices: "Invoice List",
    categories: "Categories",
    subCategories: "Sub Categories",
    users: "User Management",
    profile: "Profile",
    logout: "Logout",
  },

  dashboard: {
    title: "Dashboard",

    welcomeBack: "Welcome back,",

    subtitle: "Select a module to continue.",

    modules: "Modules",

    loading: "Loading dashboard...",

    loadAccountError: "Unable to load account.",

    noModules: "No Modules Available",

    noModulesDescription: "Your account currently has no module access.",

    open: "Open",

    calculatorDescription: "Open calculator.",

    invoicesDescription: "View saved records.",

    categoriesDescription: "Manage categories.",

    subCategoriesDescription: "Manage sub categories.",

    usersDescription: "Manage system users.",
  },

  auth: {
    signIn: "Sign in",

    signInDescription: "Sign in to continue",

    usernameOrEmail: "Username or Email",

    usernameOrEmailPlaceholder: "Username or email",

    password: "Password",

    passwordPlaceholder: "Password",

    enterUsernameOrEmail: "Enter your username or email.",

    enterPassword: "Enter your password.",

    loginFailed: "Login failed.",

    secureLogin: "Secure account access",
  },

  invoice: {
    title: "Invoice List",

    savedRecords: "Saved records",

    detail: "Invoice Detail",

    category: "Category",

    subCategories: "Sub Categories",

    date: "Date",

    total: "Total",

    action: "Action",

    entries: "entries",

    searchPlaceholder: "Search category or sub category...",

    noRecords: "No records found",

    loading: "Loading records...",

    deleteSuccess: "Record deleted successfully.",

    deleteFailed: "Unable to delete record.",
  },

  users: {
    title: "User Management",

    subtitle: "Manage users and module access",

    users: "Users",

    user: "User",

    active: "Active",

    inactive: "Inactive",

    status: "Status",

    role: "Role",

    modules: "Modules",

    lastLogin: "Last Login",

    never: "Never",

    searchPlaceholder: "Search name, username or email...",

    loading: "Loading users...",

    noUsers: "No users found",

    allRoles: "All Roles",

    allUsers: "All Users",

    allStatus: "All Status",

    userRole: "User",

    superAdminRole: "Super Admin",

    allModules: "All Modules",

    noAccess: "No access",

    noModuleAccess: "No module access",

    createUser: "Create User",

    updateUser: "Update User",

    dialogDescription: "User information and module access",

    name: "Name",

    username: "Username",

    email: "Email",

    password: "Password",

    fullNamePlaceholder: "Full name",

    usernamePlaceholder: "Username",

    usernameHelp: "User can sign in using this username or email.",

    passwordPlaceholder: "Minimum 8 characters",

    keepPasswordPlaceholder: "Leave empty to keep password",

    keepPasswordHelp: "Leave empty to keep the current password.",

    moduleAccess: "Module Access",

    moduleAccessDescription: "Select which modules this user can access.",

    all: "All",

    activeAccount: "Active Account",

    activeAccountDescription: "Allow this user to log in.",

    enable: "Enable",

    disable: "Disable",

    notAllowed: "Not Allowed",

    cannotManageSuperAdmin: "You cannot manage a super admin.",

    validationName: "Name is required.",

    validationUsername: "Username is required.",

    validationUsernameLength: "Username must be at least 3 characters.",

    validationUsernameSpaces: "Username cannot contain spaces.",

    validationEmail: "Email is required.",

    validationPassword: "Password must be at least 8 characters.",

    checkForm: "Check Form",

    created: "Created",

    createSuccess: "User created successfully.",

    updated: "Updated",

    updateSuccess: "User updated successfully.",

    saveFailed: "Save Failed",

    saveFailedDetail: "Unable to save user.",

    loadFailed: "Load Failed",

    loadFailedDetail: "Unable to load users.",

    activated: "Activated",

    deactivated: "Deactivated",

    activateSuccess: "User account activated successfully.",

    deactivateSuccess: "User account deactivated successfully.",

    statusUpdateFailed: "Update Failed",

    statusUpdateFailedDetail: "Unable to update status.",
  },
  category: {
    title: "Categories",

    description: "Manage calculator categories.",

    add: "Add Category",

    name: "Name",

    number: "Number",

    searchPlaceholder: "Search category...",

    noCategories: "No categories found.",

    createTitle: "Create Category",

    editTitle: "Edit Category",

    namePlaceholder: "Enter category name",

    numberPlaceholder: "Enter number",

    nameRequired: "Category Name Required",

    enterName: "Please enter a category name.",

    numberRequired: "Number Required",

    enterNumber: "Please enter the category number.",

    created: "Created",

    createSuccess: "Category created successfully.",

    updated: "Updated",

    updateSuccess: "Category updated successfully.",

    deleted: "Deleted",

    deleteSuccess: "Category deleted successfully.",

    deleteTitle: "Delete Category",

    deleteMessage: 'Delete "{name}"?',

    loadFailed: "Unable to load categories.",

    saveFailed: "Unable to save category.",

    deleteFailed: "Unable to delete category.",
  },

  subCategory: {
    title: "Sub Categories",

    subtitle: "2 Digit / 3 Digit Values",

    add: "Add Sub Category",

    total: "Total Sub Categories",

    showing: "Showing",

    searchPlaceholder: "Search sub category...",

    allCategories: "All Categories",

    loading: "Loading sub categories...",

    noItems: "No Sub Categories",

    createFirst: "Create your first sub category.",

    name: "Sub Category",

    nameLabel: "Sub Category Name",

    category: "Category",

    twoDigit: "2 Digit",

    threeDigit: "3 Digit",

    twoDigitValue: "2 Digit Value",

    threeDigitValue: "3 Digit Value",

    usedFor2Digit: "Used for 2-digit input",

    usedFor3Digit: "Used for 3-digit input",

    createTitle: "New Sub Category",

    editTitle: "Edit Sub Category",

    selectCategory: "Select Category",

    namePlaceholder: "Example: A",

    nameExample: "Example: A, B, C or D.",

    digitValues: "Digit Values",

    digitValuesDescription:
      "Configure a separate value for 2-digit and 3-digit inputs.",

    value: "Value",

    twoDigitPlaceholder: "Example: 3",

    threeDigitPlaceholder: "Example: 6",

    applied2Digit: "Applied when input has 2 digits",

    applied3Digit: "Applied when input has 3 digits",

    preview: "Preview",

    noCategory: "No Category",

    categoryError: "Category Error",

    categoryLoadFailed: "Unable to load categories.",

    loadFailed: "Load Failed",

    loadFailedDetail: "Unable to load sub categories.",

    validationCategory: "Please select a category.",

    validationName: "Please enter the sub category name.",

    validation2Digit: "2 digit value must be at least 1.",

    validation3Digit: "3 digit value must be at least 1.",

    checkForm: "Check Form",

    created: "Created",

    createSuccess: "Sub category created successfully.",

    updated: "Updated",

    updateSuccess: "Sub category updated successfully.",

    saveFailed: "Save Failed",

    saveFailedDetail: "Unable to save sub category.",

    deleteTitle: "Delete Sub Category",

    deleteMessage: 'Delete "{name}"?',

    deleted: "Deleted",

    deleteSuccess: "Sub category deleted successfully.",

    deleteFailed: "Delete Failed",

    deleteFailedDetail: "Unable to delete sub category.",
  },
  language: {
    english: "English",

    khmer: "Khmer",
  },

  calculator: {
    title: "Calculator",

    clear: "Clear",
    reset: "Reset",
    entries: "entries",

    categoryError: "Category Error",
    categoryLoadFailed: "Unable to load categories.",

    subCategoryError: "Sub Category Error",
    subCategoryLoadFailed: "Unable to load sub categories.",

    selectCategory: "Select Category",
    selectCategoryFirst: "Select a category first.",

    selectMatch: "Select Match",
    selectMatchFirst: "Select a match first.",

    enterNumber: "Enter Number",
    enterNumberFirst: "Enter a 2 or 3 digit number first.",

    selectCategoryAndMatch: "Select category and match first.",

    numberLengthError: "Number must contain 2 or 3 digits.",

    invalidSelectedValues: "Selected values are invalid.",

    selectOperator: "Select >, × or :.",

    enterAmount: "Enter an amount.",

    enterEndingNumber: "Enter the ending number.",

    sameDigitLength: "Start and end numbers must have the same digit length.",

    endNumberError:
      "Ending number must be greater than or equal to the start number.",

    refreshFailed: "Unable to refresh.",

    checkInput: "Check Input",

    unableToAdd: "Unable to Add",
    addFailed: "Unable to add entry.",

    noEntries: "No Entries",
    addAtLeastOne: "Add at least one entry.",

    saved: "Saved",
    savedSuccessfully: "Saved successfully.",

    saveFailed: "Save Failed",
    unableToSave: "Unable to save.",
  },

  invoice: {
    title: "Invoice List",

    savedRecords: "Saved records",

    searchPlaceholder: "Search category or sub category...",

    loading: "Loading records...",

    noRecords: "No records found",

    category: "Category",

    subCategories: "Sub Categories",

    date: "Date",

    total: "Total",

    action: "Action",

    entries: "entries",

    detail: "Invoice Detail",

    viewDetail: "View detail",

    loadFailed: "Load Failed",

    loadFailedDetail: "Unable to load records.",

    deleted: "Deleted",

    deleteSuccess: "Record deleted successfully.",

    deleteFailed: "Delete Failed",

    deleteFailedDetail: "Unable to delete record.",
  },
  profile: {
    title: "Profile",

    account: "Account",

    accountInformation: "Account Information",

    name: "Name",

    username: "Username",

    email: "Email",

    role: "Role",

    user: "User",

    superAdmin: "Super Admin",

    moduleAccess: "Module Access",

    moduleAccessDescription: "Modules available for this account.",

    superAdminAccessDescription: "Super Admin has access to all modules.",

    noModuleAccess: "No module access",

    logout: "Logout",
  },
};
