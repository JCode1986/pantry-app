'use server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const supabaseServer = async () => {
    const cookieStore = await cookies();
    return createServerComponentClient({ cookies: cookieStore });
};
