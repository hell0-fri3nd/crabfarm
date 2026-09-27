import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '~/components/ui/breadcrumb';
import type{ BreadcrumbItem as BreadcrumbItemType } from '../types';
import { Link } from 'react-router';
import { Fragment } from 'react';
import { useLocation } from 'react-router';

const Breadcrumbs = ({ breadcrumbs }: { breadcrumbs: BreadcrumbItemType[] }) => {
    const location = useLocation();
    return (
        <>
            {breadcrumbs.length > 0 && (
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((item, index) => {
                            const isLast = index === breadcrumbs.length - 1;
                            const isActive = location.pathname === item.href;
                            return (
                                <Fragment key={index}>
                                    <BreadcrumbItem>
                                        {isActive ? (
                                            <BreadcrumbPage>{item.title}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink asChild>
                                                <Link to={item.href}>{item.title}</Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && <BreadcrumbSeparator />}
                                </Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
        </>
    );
}

export default Breadcrumbs