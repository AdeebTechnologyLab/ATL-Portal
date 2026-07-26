import { motion } from 'framer-motion';

const DataTable = ({
    columns,
    data,
    onRowClick,
    emptyMessage = 'No data available',
    isLoading = false,
}) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-8 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                                <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-12 text-center">
                <p className="text-gray-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-max">
                    <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-100">
                            {columns.map((column, index) => (
                                <th
                                    key={index}
                                    className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((row, rowIndex) => (
                            <motion.tr
                                key={row.id || rowIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: rowIndex * 0.05 }}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={`hover:bg-gray-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''
                                    }`}
                            >
                                {columns.map((column, colIndex) => (
                                    <td key={colIndex} className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}>
                                        {column.render ? column.render(row) : row[column.accessor]}
                                    </td>
                                ))}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;


