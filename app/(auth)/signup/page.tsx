"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { signup } from "@/app/actions/auth";
import { transitionBouncy } from "@/lib/motion";

export default function Signup() {
  const [state, formAction, pending] = useActionState(signup, { message: "" });

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <div className="min-h-screen bg-acid-gradient grid md:grid-cols-10">
      <aside className="hidden md:flex md:col-span-6 items-end p-12">
        <h1 className="text-7xl font-extrabold uppercase leading-[0.9] max-w-xl">
          Join the
          <br />
          sCRAPbook
        </h1>
      </aside>
      <main className="md:col-span-4 min-h-screen border-t-4 md:border-t-0 md:border-l-4 border-[#111] bg-[#FAF8F5] grid content-center px-8 py-16">
        <header className="mb-8">
          <h2 className="text-5xl font-extrabold uppercase tracking-tight">Sign up</h2>
          <p className="font-semibold mt-2 text-[#111]/60">Create your first entry now!.</p>
        </header>
        <form action={formAction} className="vybe-card p-6 flex flex-col gap-3">
          <label htmlFor="username" className="font-extrabold uppercase text-sm">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="vybe-input"
            placeholder="Username"
            name="username"
            required
          />
          <label htmlFor="email" className="font-extrabold uppercase text-sm">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="vybe-input"
            placeholder="you@gmail.com"
            name="email"
            required
          />
          <label htmlFor="password" className="font-extrabold uppercase text-sm">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="vybe-input"
            placeholder="At least 6 characters"
            name="password"
            minLength={6}
            required
          />
          <motion.button
            type="submit"
            disabled={pending}
            className="vybe-btn py-3 mt-2"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={transitionBouncy}
          >
            {pending ? "Creating..." : "Create account"}
          </motion.button>
        </form>
        <p className="mt-6 font-bold">
          Already in?{" "}
          <Link href="/login" className="underline decoration-4 decoration-[#14B8A6]">
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
