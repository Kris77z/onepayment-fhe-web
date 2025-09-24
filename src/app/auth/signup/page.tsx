"use client";

import React from "react";
import Navbar from "@/components/sections/navbar";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  function getErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const e = err as { data?: { error?: string }; message?: string };
      return e?.data?.error || e?.message || 'Registration failed. Please try another email.';
    }
    return String(err || 'Registration failed');
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const confirm = String(data.get('confirm') || '');
    if(!email || !password){
      toast.error('Validation', 'Please enter email and password');
      return;
    }
    if(password !== confirm){
      toast.error('Validation', 'Passwords do not match');
      return;
    }
    try{
      setLoading(true);
      console.log('Attempting registration with:', { email });
      const result = await postJson('/auth/register', { email, password });
      console.log('Registration successful:', result);
      toast.success('Registration successful', 'Redirecting...');
      
      // 延迟一下让用户看到成功消息
      setTimeout(() => {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
        window.location.href = redirect;
      }, 1000);
    }catch(err: unknown){
      console.error('Register failed', err);
      const errorMsg = getErrorMessage(err);
      toast.error('Register failed', errorMsg);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md px-4 py-10 lg:px-6">
          <div className="flex items-center space-x-2">
            <Image src="/images/onepay-light.png" alt="OnePay" width={32} height={32} />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-foreground">Create your account</h3>

          <form action="#" method="post" className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input type="email" id="email" name="email" autoComplete="email" placeholder="you@example.com" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <Input type="password" id="password" name="password" placeholder="********" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="confirm" className="text-sm font-medium text-foreground">Confirm password</Label>
              <Input type="password" id="confirm" name="confirm" placeholder="********" className="mt-2" />
            </div>
            <Button type="submit" className="mt-4 w-full py-2 font-medium" disabled={loading}>{loading ? 'Signing up...' : 'Sign up'}</Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account? <Link href="/auth" className="font-medium text-primary hover:text-primary/90">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

