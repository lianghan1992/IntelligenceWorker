
// Tool Definitions for Function Calling

export const TOOLS = [
    {
        type: "function",
        function: {
            name: "search_knowledge_base",
            description: "Search the internal vector database for technical intelligence, articles, and data. Use this when you need facts to support your analysis.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The semantic search query."
                    },
                    start_date: {
                        type: "string",
                        description: "Optional start date filter (YYYY-MM-DD)."
                    },
                    end_date: {
                        type: "string",
                        description: "Optional end date filter (YYYY-MM-DD)."
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "render_visual_report",
            description: "Render a visual HTML report/slide for the user. Use this when you have gathered enough information and want to present the final analysis.",
            parameters: {
                type: "object",
                properties: {
                    html_content: {
                        type: "string",
                        description: "The complete, standalone HTML code for the report. Must use TailwindCSS."
                    }
                },
                required: ["html_content"]
            }
        }
    }
];
