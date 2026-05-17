type Props = {
    message: string;
    onDismiss: () => void;
};

export default function ErrorBanner({ message, onDismiss }: Props) {
    return (
        <div className="w-full bg-[#fef2f2] border-b border-[#fecaca] px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#b91c1c] text-sm font-medium">
                <span>&#9888;</span>
                <span>{message}</span>
            </div>
            <button
                onClick={onDismiss}
                className="text-[#b91c1c] text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-[#fecaca] transition cursor-pointer"
            >
                &#10005;
            </button>
        </div>
    );
}
