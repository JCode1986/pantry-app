import FridgeSection from "@/components/FridgeSection";
import { getSession } from "@/lib/sessionOptions";

export default async function page() {
    const session = await getSession();
    const user = session?.user?.user
    return (
        <FridgeSection user={user}/>
    );
}
