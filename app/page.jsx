import HomeSection from "@/components/HomeSection";
import { getSession } from "@/lib/sessionOptions";
import { createClient } from "@/utils/supabase/server";

//TO DO: get data from server side

export default async function Home() {
  const session = await getSession();
  const user = session?.user?.user;

  
  let storages = [];

  if (user) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("food_storages")
      .select("id, name, ingredients (id)") // include ingredients count
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching storages:", error);
    } else {
      storages = data ?? [];
    }
  }

  return (
    <HomeSection user={user} storages={storages}/>
  );
}

// import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';
// import HomeSection from "@/components/HomeSection";

// export default async function Home() {
//   const supabase = createServerComponentClient({ cookies });

//   const {
//     data: { session }
//   } = await supabase.auth.getSession();

//   const user = session?.user;

//   let storages = [];
//   if (user) {
//     const { data, error } = await supabase
//       .from('food_storages')
//       .select(`
//         id, name,
//         ingredients(count)
//       `);

//     if (error) console.error('Error fetching storages:', error);
//     else storages = data;
//   }

//   return (
//     <HomeSection user={user} storages={storages} />
//   );
// }
