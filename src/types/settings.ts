export interface AppSettings {
    urssafRate: number;
    shopifyTransactionPercent: number;
    shopifyFixedFee: number;
    defaultOtherFees: number;
    tvaIngredients: number;
    tvaPackaging: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
    urssafRate: 12.3,
    shopifyTransactionPercent: 2.9,
    shopifyFixedFee: 0.30,
    defaultOtherFees: 0.10,
    tvaIngredients: 5.5,
    tvaPackaging: 20
};
