import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Spinner,
  Button,
  TextInput,
  Pagination,
  Tooltip,
} from 'flowbite-react';
import { HiSearch, HiCog } from 'react-icons/hi';

interface Bucket {
  name: string;
  created: string;
  location: string;
  storageClass: string;
}

function BucketList() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [bucketsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBuckets = async () => {
      try {
        const bucketList = await window.electron.ipcRenderer.invoke(
          'list-buckets-with-info',
        );
        setBuckets(bucketList);
      } catch (error) {
        console.error('Error fetching buckets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBuckets();
  }, []);

  const filteredBuckets = buckets.filter((bucket) =>
    bucket.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const indexOfLastBucket = currentPage * bucketsPerPage;
  const indexOfFirstBucket = indexOfLastBucket - bucketsPerPage;
  const currentBuckets = filteredBuckets.slice(
    indexOfFirstBucket,
    indexOfLastBucket,
  );

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleBucketClick = (bucketName: string) => {
    navigate(`/bucket/${bucketName}`);
  };

  return (
    <div className="container mx-auto p-4" data-testid="bucket-list">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          GCS Buckets
          <Tooltip content="Configure">
            <Button
              color="gray"
              pill
              size="xs"
              onClick={() => navigate('/config')}
              className="ml-2"
            >
              <HiCog className="h-4 w-4" />
            </Button>
          </Tooltip>
        </h1>
        <div className="flex items-center">
          <TextInput
            type="text"
            placeholder="Search buckets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={HiSearch}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="xl" />
        </div>
      ) : (
        <>
          <Table hoverable>
            <Table.Head>
              <Table.HeadCell>Bucket Name</Table.HeadCell>
              <Table.HeadCell>Created</Table.HeadCell>
              <Table.HeadCell>Location</Table.HeadCell>
              <Table.HeadCell>Storage Class</Table.HeadCell>
            </Table.Head>
            <Table.Body className="divide-y">
              {currentBuckets.map((bucket) => (
                <Table.Row
                  key={bucket.name}
                  className="bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <Table.Cell
                    className="whitespace-nowrap font-medium text-gray-900 dark:text-white cursor-pointer hover:underline"
                    onClick={() => handleBucketClick(bucket.name)}
                  >
                    {bucket.name}
                  </Table.Cell>
                  <Table.Cell>
                    {new Date(bucket.created).toLocaleString()}
                  </Table.Cell>
                  <Table.Cell>{bucket.location}</Table.Cell>
                  <Table.Cell>{bucket.storageClass}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <div className="flex items-center justify-center text-center mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredBuckets.length / bucketsPerPage)}
              onPageChange={paginate}
              showIcons
            />
          </div>
        </>
      )}
    </div>
  );
}

export default BucketList;
