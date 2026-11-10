export interface FacilityDocumentInput {
    cid: string;
    docType: string;
    title: string;
}

export const FACILITY_CONTRACTS: FacilityDocumentInput[] = [
    {
        cid: "bafkreib4z6m55m7h43baf6vrpre6wbobmmkv4joqgvwou22dui6sdbtdji",
        docType: "Facility Contract",
        title: "Measurement Disclosure Agreement"
    },
    {
        cid: "bafkreiebyahgas7fcbkn5l5btbyy4diegstg6vymn7rkdoqwkljvywegcy",
        docType: "Facility Contract",
        title: "Gateway Key Management Agreement"
    },
    {
        cid: "bafkreiazoh3pzxb7xkpfpahx2homftykipjwsnyxy6fojlixycwxmexc6e",
        docType: "Facility Contract",
        title: "Facility Inspection And Cooperation Agreement"
    },
    {
        cid: "bafkreieh2xx3cvhg7wdntzifj53tzgdhdommsgogasbsrvuwaj272ompj4",
        docType: "Facility Contract",
        title: "Incident Disclosure Agreement"
    },
    {
        cid: "bafkreidglsdrujbietvdp4hjxcsecwn7rxfidlm5f7l42uyudiapeadzhy",
        docType: "Facility Contract",
        title: "Assessment Disclosure Agreement"
    }
];
export const INSPECTOR_CONTRACT : FacilityDocumentInput = {
    cid: "bafkreih6vihdkwrurh4h5lksitxzqgn4stpxqadxujxkulfppilmw3xqf4",
    docType: "Inspector Contract",
    title: "Inspector Independence and Conduct Agreement"
}