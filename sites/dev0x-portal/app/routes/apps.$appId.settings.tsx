import { useNavigate } from '@remix-run/react';
import * as Drawer from '../components/Drawer';

export default function AppSettings() {
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
            <Drawer.Content position="right">
                <div className="p-6 font-sans text-base">Settings</div>
            </Drawer.Content>
        </Drawer.Root>
    );
}
