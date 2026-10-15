import { useI18n } from "@/shared/i18n/i18n";

export function WizardFooter({
  onBack,
  onContinue,
  onSkip,
  continueLabel,
  continueDisabled = false,
  showBack = true,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showBack?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        marginTop: 24,
      }}
    >
      {onContinue && (
        <button
          type="button"
          className="pb-btn pb-btn-primary"
          onClick={onContinue}
          disabled={continueDisabled}
          style={{ flex: "1 1 200px" }}
        >
          {continueLabel ?? t("action.continue")}
        </button>
      )}
      {onSkip && (
        <button
          type="button"
          className="pb-btn"
          onClick={onSkip}
          style={{ background: "transparent", color: "var(--color-primary)" }}
        >
          {t("action.skip")}
        </button>
      )}
      {showBack && onBack && (
        <button
          type="button"
          className="pb-btn"
          onClick={onBack}
          style={{ background: "transparent", color: "var(--color-primary)" }}
        >
          {t("action.back")}
        </button>
      )}
    </div>
  );
}
