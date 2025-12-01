const eslintConfig = [
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "out/**",
            "build/**",
            "next-env.d.ts",
        ],
    },
    {
        rules: {
            // Desactiva los que te están tronando el build
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "react-hooks/exhaustive-deps": "warn",
            "@next/next/no-img-element": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "react/no-unescaped-entities": "off",
        },
    },
];

export default eslintConfig;