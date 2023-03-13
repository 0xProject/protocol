import { useParams } from '@remix-run/react';

export default function AppDashboard() {
    const { appName } = useParams();
    return <div> {appName} dashboard</div>;
}
