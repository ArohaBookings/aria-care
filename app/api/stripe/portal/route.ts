import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("organisation_id").eq("id", user.id).single();
    const { data: org } = await supabase.from("organisations").select("stripe_customer_id").eq("id", profile?.organisation_id).single();

    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found. Please subscribe first." }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Billing portal error:", error);
    return NextResponse.json({ error: "Could not open billing portal" }, { status: 500 });
  }
}
