<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Tag from "primevue/tag";
import api from "../services/api.js";
import socket from "../services/socket.js";
import { authState, logout } from "../stores/auth.js";

const router = useRouter();
const apiMessage = ref("Checking protected API...");
const socketStatus = ref(socket.connected ? "Connected" : "Connecting...");

function onConnect() {
  socketStatus.value = "Connected";
}

function onDisconnect() {
  socketStatus.value = "Disconnected";
}

onMounted(async () => {
  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);

  try {
    const { data } = await api.get("/admin/dashboard");
    apiMessage.value = data.message;
  } catch (error) {
    apiMessage.value = error.response?.data?.message || "Unable to load protected API.";
  }
});

onBeforeUnmount(() => {
  socket.off("connect", onConnect);
  socket.off("disconnect", onDisconnect);
});

async function signOut() {
  logout();
  await router.replace("/login");
}
</script>

<template>
  <main class="min-h-screen bg-slate-100">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin</p>
          <h1 class="text-xl font-bold text-slate-900">Main Page</h1>
        </div>
        <Button label="Logout" icon="pi pi-sign-out" severity="secondary" outlined @click="signOut" />
      </div>
    </header>

    <section class="mx-auto grid max-w-6xl gap-5 px-5 py-8 md:grid-cols-3">
      <article class="rounded-3xl bg-slate-950 p-6 text-white md:col-span-2">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-slate-400">Signed in as</p>
            <h2 class="mt-2 text-3xl font-bold">{{ authState.user?.name }}</h2>
            <p class="mt-2 text-slate-300">{{ authState.user?.email }}</p>
          </div>
          <Tag value="SUPER_ADMIN" severity="success" />
        </div>

        <div class="mt-8 rounded-2xl bg-white/10 p-4">
          <p class="text-xs uppercase tracking-widest text-slate-400">Protected API</p>
          <p class="mt-2 text-sm text-slate-100">{{ apiMessage }}</p>
        </div>
      </article>

      <article class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-slate-900">Socket.IO</h3>
          <span
            class="h-3 w-3 rounded-full"
            :class="socketStatus === 'Connected' ? 'bg-emerald-500' : 'bg-amber-500'"
          />
        </div>
        <p class="mt-4 text-2xl font-bold text-slate-900">{{ socketStatus }}</p>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          The socket connection uses the same JWT as the REST API.
        </p>
      </article>
    </section>
  </main>
</template>
