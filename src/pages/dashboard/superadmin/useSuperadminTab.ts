import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { SuperadminTabId } from "./SuperadminNav";
import { VALID_SUPERADMIN_TABS } from "./superadminTabMeta";

function parseTab(raw: string | null): SuperadminTabId {
    if (raw && VALID_SUPERADMIN_TABS.includes(raw as SuperadminTabId)) {
        return raw as SuperadminTabId;
    }
    return "overview";
}

export function useSuperadminTab() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = parseTab(searchParams.get("tab"));

    const setActiveTab = useCallback(
        (tab: SuperadminTabId) => {
            if (tab === "overview") {
                setSearchParams({}, { replace: true });
            } else {
                setSearchParams({ tab }, { replace: true });
            }
        },
        [setSearchParams],
    );

    return { activeTab, setActiveTab };
}
