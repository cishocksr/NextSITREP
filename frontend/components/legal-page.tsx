type LegalSection = {
    title: string;
    body?: string;
    items?: string[];
};

type LegalPageProps = {
    title: string;
    lastUpdated?: string;
    intro?: string;
    sections: LegalSection[];
};

export default function LegalPage({
    title,
    lastUpdated,
    intro,
    sections,
}: LegalPageProps) {
    return (
        <main className="mx-auto max-w-4xl px-6 py-12">
            <header className="mb-10 border-b pb-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                    VeteransConnect
                </p>

                <h1 className="mt-2 text-4xl font-bold text-gray-900">{title}</h1>

                {lastUpdated && (
                    <p className="mt-3 text-sm text-gray-500">
                        Last Updated: {lastUpdated}
                    </p>
                )}

                {intro && <p className="mt-6 text-lg leading-8 text-gray-700">{intro}</p>}
            </header>

            <section className="space-y-10">
                {sections.map((section) => (
                    <article key={section.title}>
                        <h2 className="text-2xl font-semibold text-gray-900">
                            {section.title}
                        </h2>

                        {section.body && (
                            <p className="mt-3 leading-7 text-gray-700">{section.body}</p>
                        )}

                        {section.items && (
                            <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
                                {section.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        )}
                    </article>
                ))}
            </section>
        </main>
    );
}