import { useNavigate } from '@remix-run/react';
import * as Drawer from '../components/Drawer';

export default function AppApiKey() {
    const navigate = useNavigate();
    return (
        <Drawer.Root
            open={true}
            onOpenChange={(open) => {
                if (!open) {
                    navigate('../');
                }
            }}
        >
            <Drawer.Content position="right" className="w-[400px]">
                <div className="p-6 font-sans text-base">Api Key</div>
            </Drawer.Content>
        </Drawer.Root>
    );
}
