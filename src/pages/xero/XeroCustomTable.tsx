import React, { useState, useEffect } from 'react';
import { Table, Card, message, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import xeroService from '../../services/xeroService';

interface XeroCustomTableProps {
  tableName: string;
  title: string;
}

const XeroCustomTable: React.FC<XeroCustomTableProps> = ({ tableName, title }) => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [columns, setColumns] = useState<ColumnsType<Record<string, any>>>([]);

  const fetchData = async (currentPage: number, currentPageSize: number) => {
    setLoading(true);
    try {
      const response = await xeroService.getCustomTableData(tableName, {
        page: currentPage,
        page_size: currentPageSize,
      });
      setData(response.data);
      setTotal(response.total);

      if (response.data.length > 0) {
        const keys = Object.keys(response.data[0]);
        const generatedColumns: ColumnsType<Record<string, any>> = keys.map((key) => ({
          title: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          dataIndex: key,
          key: key,
          ellipsis: true,
          render: (value: any) => {
            if (value === null || value === undefined) return '-';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
          },
        }));
        setColumns(generatedColumns);
      }
    } catch (error: any) {
      message.error(`Failed to fetch ${title} data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, pageSize);
  }, [page, pageSize, tableName]);

  return (
    <div style={{ padding: '24px' }}>
      <Card title={title}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey={(record, index) => record.id || String(index)}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (t) => `Total ${t} records`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
            scroll={{ x: 'max-content' }}
            size="small"
          />
        </Spin>
      </Card>
    </div>
  );
};

export default XeroCustomTable;
