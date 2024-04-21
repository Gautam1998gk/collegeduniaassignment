import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import { FaArrowDown } from "react-icons/fa6";
//3 TanStack Libraries!!!
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  OnChangeFn,
  Row,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'

import { fetchData, College, PersonApiResponse } from './makeData'
interface ColumnFilter {
  id: string
  value: unknown
}
type ColumnFiltersState = ColumnFilter[]

const fetchSize = 10

function App() {
  //we need a reference to the scrolling element for logic down below
  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  const [searchValue, setSearchValue] = useState<string>('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // Filter data based on searchValue
 
 
  const columns = React.useMemo<ColumnDef<College>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
      },
      {
        accessorKey: 'name',
        cell: info => info.getValue(),
        header: () => <span>College Name</span>,
      },
      {
        accessorFn: row => row.location,
        id: 'location',
        cell: info => info.getValue(),
        header: () => <span>Location</span>,
      },
      {
        accessorKey: 'rating',
        header: () => 'Collegedunia Rating',
        sortingFn: 'myCustomSortingFn', 
        size: 50,
      },
      {
        accessorKey: 'fees',
        header: 'Course Fees',
        cell: info =>Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(info.getValue()),
        sortingFn: 'myCustomSortingFn', 
        size: 100,
      },
      {
        accessorKey: 'userReviewRating',
        header: 'userReviewRating',
        sortingFn: 'myCustomSortingFn', 
      },
     /*  {
        accessorKey: 'progress',
        header: 'Profile Progress',
        size: 80,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: info => info.getValue<Date>().toLocaleString(),
        size: 200,
      }, */
    ],
    []
  )

  //react-query has a useInfiniteQuery hook that is perfect for this use case
  const { data, fetchNextPage, isFetching, isLoading } =
    useInfiniteQuery<PersonApiResponse>({
      queryKey: [
        'colleges',
        sorting, //refetch when sorting changes
      ],
      queryFn: async ({ pageParam = 0 }) => {
        const start = (pageParam as number) * fetchSize
        const fetchedData = await fetchData(start, fetchSize, sorting) //pretend api call
        return fetchedData
      },
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      refetchOnWindowFocus: false,
      placeholderData: keepPreviousData,
    })

  //flatten the array of arrays from the useInfiniteQuery hook
  const flatData = React.useMemo(
    () => data?.pages?.flatMap(page => page.data) ?? [],
    [data]
  )

  const filteredData = React.useMemo(
    () => flatData.filter((item: College) => item.name.toLowerCase().includes(searchValue.toLowerCase())),
    [flatData, searchValue]
  )
  
  const totalDBRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0
  const totalFetched = flatData.length

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = React.useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement
        //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (
          scrollHeight - scrollTop - clientHeight < 500 &&
          !isFetching &&
          totalFetched < totalDBRowCount
        ) {
          fetchNextPage()
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalDBRowCount]
  )

  //a check on mount and after a fetch to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  React.useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current)
  }, [fetchMoreOnBottomReached])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    manualFiltering: true,
    manualSorting: true,
    debugTable: true,
    sortingFns: { //add a custom sorting function
      myCustomSortingFn: (rowA, rowB, columnId) => {
        return rowA.original[columnId] > rowB.original[columnId] ? 1 : rowA.original[columnId] < rowB.original[columnId] ? -1 : 0 
      },
    },
  })


  //scroll to top of table when sorting changes
  const handleSortingChange: OnChangeFn<SortingState> = updater => {
    setSorting(updater)
    if (!!table.getRowModel().rows.length) {
      rowVirtualizer.scrollToIndex?.(0)
    }
  }

  //since this table option is derived from table row model state, we're using the table.setOptions utility
  table.setOptions(prev => ({
    ...prev,
    onSortingChange: handleSortingChange,
  }))

 
  const { rows } = table.getRowModel()


  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 100, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== 'undefined' &&
      navigator.userAgent.indexOf('Firefox') === -1
        ? element => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  })

  if (isLoading) {
    return <>Loading...</>
  }



  return (
    <div className=" m-4"  onScroll={e => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
    ref={tableContainerRef}
    style={{
      overflow: 'auto', //our scrollable table container
      position: 'relative', //needed for sticky header
      height: '700px', //should be a fixed height
    }}>
    <h2 className='text-xl font-bold border-2 py-2'>COLLEGE DETAILS</h2>
    <div className='my-4 flex gap-4'>
    <input type='text' placeholder='Search college ' className='border-2 border-gray-400 rounded-lg w-[400px] h-[40px] px-4' value={searchValue} onChange={handleSearchChange} />
    <p>Click on Table Name to sort the respective field</p> 
    </div>
      <div
        onScroll={e => fetchMoreOnBottomReached(e.target as HTMLDivElement)}
        ref={tableContainerRef}
        className='w-full'
      >
        {/* Even though we're still using sematic table tags, we must use CSS grid and flexbox for dynamic row heights */}
        <table  className='w-full'>
          <thead
            style={{
              display: 'grid',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            {table.getHeaderGroups().map(headerGroup => (
              <tr
                key={headerGroup.id}
                className='w-full flex h-[50px] items-center px-4 justify-between'
              >
                {headerGroup.headers.map(header => {
                
                  
                  return (
                    <th
                      key={header.id}
                      style={{
                        display: 'flex',
                        width: header.getSize(),
                      }}
                    >
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? 'cursor-pointer select-none'
                            : '',
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              display: 'grid',
              height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
              position: 'relative', //needed for absolute positioning of rows
            }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index] as Row<College>
              const isFeatured = row.original.featured;
              return (
                <tr
                  data-index={virtualRow.index} //needed for dynamic row height measurement
                  ref={node => rowVirtualizer.measureElement(node)} //measure dynamic row height
                  key={row.id}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`, 
                    backgroundColor:`${isFeatured &&"#fed8b1 "}`//this should always be a `style` as it changes on scroll
                  }}
                  className={`h-[100px] flex absolute w-full justify-between items-center px-2`}
                >
                    
                  {row.getVisibleCells().map(cell => {
                    return (
                      <td
                        key={cell.id}
                        style={{
                          display: 'flex',
                          width: cell.column.getSize(),
                        }}
                      >
                        
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    )
                  })}
                </tr>
                 
              )
            })}
          </tbody>
        </table>
      </div>
    
    </div>
  )
}

const rootElement = document.getElementById('root')

if (!rootElement) throw new Error('Failed to find the root element')

const queryClient = new QueryClient()

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
