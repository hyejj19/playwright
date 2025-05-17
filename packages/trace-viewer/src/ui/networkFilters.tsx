/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import './networkFilters.css';
import { useEffect, useRef, useState } from 'react';

const resourceTypes = ['All', 'Fetch', 'HTML', 'JS', 'CSS', 'Font', 'Image'] as const;
export type ResourceType = typeof resourceTypes[number];

export type FilterState = {
  searchValue: string;
  resourceType: ResourceType;
};

export const defaultFilterState: FilterState = { searchValue: '', resourceType: 'All' };

export const NetworkFilters = ({ filterState, onFilterStateChange }: {
  filterState: FilterState,
  onFilterStateChange: (filterState: FilterState) => void,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [stackedItems, setStackedItems] = useState<ResourceType[]>([]);
  const [visibleItems, setVisibleItems] = useState<ResourceType[]>([...resourceTypes]);

  const getItemWidth = (resourceType: ResourceType): number => {
    const tempItem = document.createElement('div');
    tempItem.className = 'network-filters-resource-type';
    tempItem.textContent = resourceType;
    document.body.appendChild(tempItem);
    const width = tempItem.getBoundingClientRect().width;
    document.body.removeChild(tempItem);
    return width;
  };

  useEffect(() => {
    if (!containerRef.current)
      return;
    const container = containerRef.current;

    const intersectionObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            const resourceType = entry.target.getAttribute('data-resource-type') as ResourceType;
            if (!entry.isIntersecting) {
              setVisibleItems(prev => prev.filter(type => type !== resourceType));
              setStackedItems(prev => [...prev, resourceType]);
            }
          });
        },
        {
          root: container,
          threshold: 1.0,
          rootMargin: '0px'
        }
    );

    const resizeObserver = new ResizeObserver(() => {
      if (stackedItems.length === 0)
        return;

      const lastVisibleItem = itemRefs.current[visibleItems.length - 1];
      if (!lastVisibleItem)
        return;

      const containerRight = container.getBoundingClientRect().right;
      const lastItemRight = lastVisibleItem.getBoundingClientRect().right;
      const availableSpace = containerRight - lastItemRight;

      const firstStackedItem = stackedItems[0];
      if (availableSpace >= getItemWidth(firstStackedItem)) {
        setStackedItems(prev => prev.slice(1));
        setVisibleItems(prev => [...prev, firstStackedItem]);
      }
    });

    resizeObserver.observe(container);
    visibleItems.forEach((type, index) => {
      const item = itemRefs.current[index];
      if (item) {
        item.setAttribute('data-resource-type', type);
        intersectionObserver.observe(item);
      }
    });

    return () => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [visibleItems, stackedItems]);

  return (
    <div className='network-filters' ref={containerRef}>
      <input
        type='search'
        placeholder='Filter network'
        spellCheck={false}
        value={filterState.searchValue}
        onChange={e => onFilterStateChange({ ...filterState, searchValue: e.target.value })}
      />

      <div className='network-filters-resource-types'>
        {visibleItems.map((resourceType, index) => (
          <div
            key={resourceType}
            title={resourceType}
            onClick={() => onFilterStateChange({ ...filterState, resourceType })}
            className={`network-filters-resource-type ${filterState.resourceType === resourceType ? 'selected' : ''}`}
            ref={el => itemRefs.current[index] = el}
          >
            {resourceType}
          </div>
        ))}
      </div>
    </div>
  );
};
