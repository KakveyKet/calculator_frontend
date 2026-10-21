<template>
  <main class="min-h-screen bg-slate-100 px-4 py-10 flex items-center justify-center">
    <section class="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <i class="pi pi-shield text-xl" />
      </div>
      <h1 class="mt-5 text-2xl font-bold text-slate-900">Access denied</h1>
      <p class="mt-2 text-slate-500">This page requires the SUPER_ADMIN role.</p>
      <RouterLink to="/profile" class="mt-6 inline-block font-semibold text-slate-900 hover:underline">
        Go to profile
      </RouterLink>
    </section>
  </main>
</template>
